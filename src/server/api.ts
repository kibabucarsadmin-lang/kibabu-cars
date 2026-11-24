import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response, Router } from 'express';
import { BUSINESS, EXTRAS, LOCATIONS, RULES, applyAddons, sortFleet } from '../shared/business';
import {
  AdminStats,
  Booking,
  BookingRequest,
  BookingStatus,
  Car,
  ContactMessage,
} from '../shared/models';
import { calculateQuote, overlaps } from '../shared/pricing';
import { db } from './db';
import { CONFIG } from './config';
import { localizeCars, localizeContent } from '../shared/content';
import { Dict, LANGS, Lang, Params, isLang, loadDict, translate, tx } from '../shared/i18n';
import { notifyBooking, notifyMessage, previewEmail, sendTestEmail, SENDER } from './mail';
import { RESEND_KEY_RE, publicSettings, seal } from './settings';
import { slugify } from '../shared/content';
import { cleanAbout, cleanBlog, cleanBusiness, cleanCar, cleanCarTexts, cleanFaq, cleanRedirects, cleanAddons } from './clean';

// dictionaries for API messages, loaded once at start
const DICTS: Partial<Record<Lang, Dict>> = {};
for (const l of LANGS) void loadDict(l).then((d) => (DICTS[l] = d));
/** Translate a message into the language of the request. */
export function tr(req: Request, text: string, p?: Params): string {
  const l = reqLang(req);
  return translate(DICTS[l] ?? {}, text, p, l);
}

/** Language the browser asked for (set by the site on every API call). */
export function reqLang(req: Request): Lang {
  const l = req.get('x-kb-lang');
  return isLang(l) ? l : 'en';
}


const ADMIN_PASSWORD = CONFIG.adminPassword || 'kibabu-admin';
const ADMIN_SECRET = CONFIG.adminSecret || randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;


const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
const BLOCKING: BookingStatus[] = ['pending', 'confirmed', 'active'];

// ---------- helpers ----------
const now = () => new Date().toISOString();
const isEmail = (s: unknown) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const str = (s: unknown, max = 500) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

function makeRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (const b of randomBytes(5)) r += alphabet[b % alphabet.length];
  return `KB-${r}`;
}

function sign(payload: string): string {
  return createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
}

function issueToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

const failedLogins: number[] = [];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!verifyToken(token)) {
    res.status(401).json({ error: tx('Please log in again.') });
    return;
  }
  next();
}

/** Very small in-memory rate limiter (per IP + bucket). */
const hits = new Map<string, number[]>();
// forget old entries so the map can't grow forever
setInterval(() => {
  const t = Date.now();
  for (const [k, list] of hits) if (!list.length || t - list[list.length - 1] > 60 * 60 * 1000) hits.delete(k);
}, 10 * 60 * 1000).unref();
/** the visitor's IP (the real one when behind Cloudflare) */
const clientIp = (req: Request) => (CONFIG.cloudflare && req.get('cf-connecting-ip')) || req.ip;
function rateLimit(bucket: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${bucket}:${clientIp(req)}`;
    const t = Date.now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (list.length >= max) {
      res.status(429).json({ error: tx('Too many requests – please wait a moment and try again.') });
      return;
    }
    list.push(t);
    hits.set(key, list);
    next();
  };
}

/** How many units of a car are free for a period. */
function availableUnits(car: Car, pickupAt: string, returnAt: string, ignoreId?: string): number {
  const taken = db
    .read()
    .bookings.filter(
      (b) =>
        b.carId === car.id &&
        b.id !== ignoreId &&
        BLOCKING.includes(b.status) &&
        overlaps(b.pickupAt, b.returnAt, pickupAt, returnAt),
    ).length;
  return Math.max(car.units - taken, 0);
}

function validateBooking(body: Partial<BookingRequest>): { errors: string[]; req?: BookingRequest; car?: Car } {
  const errors: string[] = [];
  const car = db.read().cars.find((c) => c.id === body.carId && c.active);
  if (!car) errors.push(tx('Please choose a vehicle.'));

  const pickup = new Date(body.pickupAt || '');
  const ret = new Date(body.returnAt || '');
  if (isNaN(pickup.getTime()) || isNaN(ret.getTime())) errors.push(tx('Please choose pickup and return dates.'));
  else {
    if (ret <= pickup) errors.push(tx('Return must be after pickup.'));
    if (pickup.getTime() < Date.now() - 60 * 60 * 1000) errors.push(tx('Pickup date is in the past.'));
    if (pickup.getTime() > Date.now() + 548 * 24 * 60 * 60 * 1000) errors.push(tx('Bookings can be made up to 18 months ahead.'));
    if (ret.getTime() - pickup.getTime() > 120 * 24 * 60 * 60 * 1000) errors.push(tx('For rentals longer than 4 months, please contact us.'));
  }
  const locIds = LOCATIONS.map((l) => l.id);
  if (!locIds.includes(body.pickupLocation!)) errors.push(tx('Choose a pickup location.'));
  if (!locIds.includes(body.returnLocation!)) errors.push(tx('Choose a return location.'));

  const c = body.customer || ({} as BookingRequest['customer']);
  if (str(c.name).length < 2) errors.push(tx('Enter the main driver name.'));
  if (!isEmail(c.email)) errors.push(tx('Enter a valid email.'));
  if (str(c.phone).replace(/\D/g, '').length < 7) errors.push(tx('Enter a valid WhatsApp / phone number.'));

  const drivers = Math.min(Math.max(Number(body.drivers) || 1, 1), 1 + RULES.maxExtraDrivers);
  const extras = Array.isArray(body.extras) ? [...new Set(body.extras)].filter((x) => EXTRAS.some((e) => e.id === x && !e.locked && e.active !== false)) : [];
  const insurance = null; // damage protection is no longer sold (basic insurance is included)
  const babySeats = Math.min(Math.max(Number(body.babySeats) || 0, 0), 3);
  if (errors.length) return { errors };

  return {
    errors,
    car,
    req: {
      carId: car!.id,
      pickupAt: pickup.toISOString(),
      returnAt: ret.toISOString(),
      pickupLocation: body.pickupLocation!,
      returnLocation: body.returnLocation!,
      pickupDetails: str(body.pickupDetails, 200),
      drivers,
      needPermit: true, // mandatory
      extras,
      insurance,
      passportNumber: str(body.passportNumber, 30),
      babySeats,
      customer: {
        name: str(c.name, 100),
        email: str(c.email, 150).toLowerCase(),
        phone: str(c.phone, 30),
        country: str(c.country, 60),
      },
      notes: str(body.notes, 1000),
      paymentMethod: body.paymentMethod === 'online' ? 'online' : 'arrival',
    },
  };
}

// ---------- router ----------
export function createApiRouter(): Router {
  const api = Router();
  const small = express.json({ limit: '100kb' });
  const big = express.json({ limit: '12mb' });
  // error messages in the visitor's language (admin stays in English)
  api.use((req, res, next) => {
    if (!req.path.startsWith('/admin')) {
      const json = res.json.bind(res);
      res.json = (body: unknown) => {
        const b = body as { error?: unknown };
        return json(b && typeof b.error === 'string' ? { ...b, error: tr(req, b.error) } : body);
      };
    }
    next();
  });
  api.use(rateLimit('all', 300, 60 * 1000)); // overall cap per IP
  api.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  // large bodies (photos) only for a logged-in admin; everyone else gets the small limit
  api.use((req, res, next) => {
    if (!req.path.startsWith('/admin/') || req.path === '/admin/login') return small(req, res, next);
    requireAdmin(req, res, () => big(req, res, next));
  });

  api.get('/health', (_req, res) => {
    const s = db.status();
    res.status(s.error ? 503 : 200).json({ ok: !s.error, storage: s.storage, time: now() });
  });

  api.get('/config', (_req, res) => {
    res.json({ business: BUSINESS, rules: RULES, locations: LOCATIONS });
  });

  // Public site content (business details, about, FAQ, blog)
  api.get('/content', (req, res) => {
    res.json(localizeContent(db.read().content, reqLang(req)));
  });

  // Public fleet (car texts in the visitor's language)
  api.get('/cars', (req, res) => {
    const { cars, content } = db.read();
    res.json(sortFleet(localizeCars(cars, content, reqLang(req)).filter((c) => c.active)));
  });

  api.get('/cars/:id', (req, res) => {
    const car = db.read().cars.find((c) => c.id === req.params['id'] && c.active);
    if (!car) {
      res.status(404).json({ error: tx('Vehicle not found') });
      return;
    }
    res.json(car);
  });

  // Availability for a period: { carId: unitsFree }
  api.get('/availability', (req, res) => {
    const from = String(req.query['from'] || '');
    const to = String(req.query['to'] || '');
    if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
      res.status(400).json({ error: 'from/to required' });
      return;
    }
    const out: Record<string, number> = {};
    for (const car of db.read().cars.filter((c) => c.active)) out[car.id] = availableUnits(car, from, to);
    res.json(out);
  });

  // Create booking
  api.post('/bookings', rateLimit('booking', 10, 10 * 60 * 1000), async (req, res) => {
    if (req.body?.website) { res.status(400).json({ error: tx('Something went wrong. Please try again.') }); return; } // spam bot
    const { errors, req: br, car } = validateBooking(req.body || {});
    if (errors.length || !br || !car) {
      res.status(400).json({ error: errors.map((e) => tr(req, e)).join(' ') });
      return;
    }
    if (availableUnits(car, br.pickupAt, br.returnAt) < 1) {
      res.status(409).json({
        error: tr(req, 'Sorry, the {car} is fully booked for those dates. Please pick another car or message us on WhatsApp.', { car: car.name }),
      });
      return;
    }
    const booking: Booking = {
      ...br,
      lang: reqLang(req),
      id: randomUUID(),
      ref: makeRef(),
      status: 'confirmed', // accepted automatically when the car is available
      quote: calculateQuote(car, br),
      carName: car.name,
      createdAt: now(),
      updatedAt: now(),
    };
    // re-check inside the write so two simultaneous bookings can't take the last car
    const saved = db.write((d) => {
      const taken = d.bookings.filter((b) => b.carId === car.id && BLOCKING.includes(b.status) && overlaps(b.pickupAt, b.returnAt, booking.pickupAt, booking.returnAt)).length;
      if (taken >= car.units) return false;
      d.bookings.push(booking);
      return true;
    });
    if (!saved) {
      res.status(409).json({ error: tr(req, 'Sorry, the {car} was just booked for those dates. Please pick another car.', { car: car.name }) });
      return;
    }
    // make sure it is in MySQL before we tell the guest it is booked (it is already in the local safety copy)
    if (!(await db.flush())) console.error(`[kibabu] booking ${booking.ref} kept locally, MySQL save is retrying`);
    void notifyBooking(booking);
    console.log(`[kibabu] New booking ${booking.ref} – ${car.name} – ${booking.customer.name}`);
    res.status(201).json(booking);
  });

  // Customer looks up a booking with ref + email
  api.get('/bookings/lookup', rateLimit('lookup', 20, 10 * 60 * 1000), (req, res) => {
    const ref = String(req.query['ref'] || '').trim().toUpperCase();
    const email = String(req.query['email'] || '').trim().toLowerCase();
    const b = db.read().bookings.find((x) => x.ref === ref && x.customer.email === email);
    if (!b) {
      res.status(404).json({ error: tx('No booking found with that reference and email.') });
      return;
    }
    const { adminNote: _ignored, ...publicBooking } = b;
    res.json(publicBooking);
  });

  // Customer cancels (free before pickup)
  api.post('/bookings/cancel', rateLimit('lookup', 20, 10 * 60 * 1000), (req, res) => {
    const ref = str(req.body?.ref).toUpperCase();
    const email = str(req.body?.email).toLowerCase();
    const result = db.write((d) => {
      const b = d.bookings.find((x) => x.ref === ref && x.customer.email === email);
      if (!b) return { status: 404, error: tx('Booking not found.') };
      if (!['pending', 'confirmed'].includes(b.status)) return { status: 400, error: tx('This booking can no longer be cancelled online.') };
      if (new Date(b.pickupAt) <= new Date()) return { status: 400, error: tx('Pickup time has passed – please contact us.') };
      b.status = 'cancelled';
      b.updatedAt = now();
      return { status: 200, booking: b };
    });
    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.booking);
  });

  // Contact form
  api.post('/contact', rateLimit('contact', 5, 10 * 60 * 1000), async (req, res) => {
    const b = req.body || {};
    if (b.website) { res.status(201).json({ ok: true }); return; } // spam bot: pretend success
    if (str(b.name).length < 2 || !isEmail(b.email) || str(b.message).length < 5) {
      res.status(400).json({ error: tx('Please fill in your name, a valid email and a message.') });
      return;
    }
    if (db.read().messages.length > 5000) db.write((d) => d.messages.splice(0, d.messages.length - 4000));
    const msg: ContactMessage = {
      id: randomUUID(),
      name: str(b.name, 100),
      email: str(b.email, 150),
      phone: str(b.phone, 30),
      message: str(b.message, 3000),
      createdAt: now(),
      read: false,
    };
    db.write((d) => d.messages.push(msg));
    await db.flush();
    void notifyMessage(msg);
    res.status(201).json({ ok: true });
  });

  // ---------- admin ----------
  api.post('/admin/login', rateLimit('login', 8, 15 * 60 * 1000), (req, res) => {
    // many wrong passwords from many addresses (a botnet) → pause all logins for 15 minutes
    const t = Date.now();
    while (failedLogins.length && t - failedLogins[0] > 60 * 60 * 1000) failedLogins.shift();
    if (failedLogins.length >= 30) {
      res.status(429).json({ error: tx('Too many requests – please wait a moment and try again.') });
      return;
    }
    // compare fixed-length digests, so neither the content nor the length of the password leaks through timing
    const digest = (s: string) => createHmac('sha256', ADMIN_SECRET).update(s).digest();
    const ok = timingSafeEqual(digest(String(req.body?.password ?? '').slice(0, 200)), digest(ADMIN_PASSWORD));
    if (!ok) {
      failedLogins.push(t);
      console.warn(`[kibabu] failed admin login from ${clientIp(req)}`);
      res.status(401).json({ error: tx('Wrong password.') });
      return;
    }
    console.log(`[kibabu] admin logged in from ${clientIp(req)}`);
    res.json({ token: issueToken() });
  });

  api.get('/admin/stats', requireAdmin, (_req, res) => {
    const { bookings, messages } = db.read();
    const t = Date.now();
    const week = t + 7 * 24 * 60 * 60 * 1000;
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
    bookings.forEach((b) => byStatus[b.status]++);
    const stats: AdminStats = {
      totalBookings: bookings.length,
      pending: byStatus.pending,
      activeRentals: byStatus.active,
      upcomingPickups: bookings.filter(
        (b) => ['pending', 'confirmed'].includes(b.status) && +new Date(b.pickupAt) >= t && +new Date(b.pickupAt) <= week,
      ).length,
      newToday: bookings.filter((b) => t - +new Date(b.createdAt) < 24 * 60 * 60 * 1000).length,
      revenueConfirmed: bookings
        .filter((b) => ['confirmed', 'active', 'completed'].includes(b.status))
        .reduce((s, b) => s + b.quote.total, 0),
      unreadMessages: messages.filter((m) => !m.read).length,
      byStatus,
    };
    res.json(stats);
  });

  api.get('/admin/bookings', requireAdmin, (_req, res) => {
    const list = [...db.read().bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(list);
  });

  api.patch('/admin/bookings/:id', requireAdmin, (req, res) => {
    const status = req.body?.status as BookingStatus | undefined;
    if (status && !STATUSES.includes(status)) {
      res.status(400).json({ error: tx('Invalid status') });
      return;
    }
    const updated = db.write((d) => {
      const b = d.bookings.find((x) => x.id === req.params['id']);
      if (!b) return null;
      if (status) b.status = status;
      if (typeof req.body?.adminNote === 'string') b.adminNote = str(req.body.adminNote, 2000);
      b.updatedAt = now();
      return b;
    });
    if (!updated) {
      res.status(404).json({ error: tx('Not found') });
      return;
    }
    res.json(updated);
  });

  api.get('/admin/cars', requireAdmin, (_req, res) => {
    res.json(db.read().cars);
  });

  api.post('/admin/cars', requireAdmin, (req, res) => {
    const car = cleanCar(req.body || {});
    if (!car.name) { res.status(400).json({ error: tx('Give the car a name.') }); return; }
    if (!(car.pricePerDay > 0)) { res.status(400).json({ error: tx('Set a price per day.') }); return; }
    const created = db.write((d) => {
      let id = slugify(car.name) || 'car';
      let n = 2;
      while (d.cars.some((c) => c.id === id)) id = `${slugify(car.name)}-${n++}`;
      const full = { ...car, id };
      d.cars.push(full);
      return full;
    });
    res.status(201).json(created);
  });

  api.delete('/admin/cars/:id', requireAdmin, (req, res) => {
    const id = req.params['id'];
    const upcoming = db.read().bookings.some((b) => b.carId === id && BLOCKING.includes(b.status) && new Date(b.returnAt) > new Date());
    if (upcoming) {
      res.status(409).json({ error: tx('This car has upcoming bookings. Take it offline instead, or cancel those bookings first.') });
      return;
    }
    const ok = db.write((d) => {
      const i = d.cars.findIndex((c) => c.id === id);
      if (i < 0) return false;
      d.cars.splice(i, 1);
      return true;
    });
    if (!ok) { res.status(404).json({ error: tx('Not found') }); return; }
    res.json({ ok: true });
  });

  api.put('/admin/cars/:id', requireAdmin, (req, res) => {
    const b = req.body || {};
    const updated = db.write((d) => {
      const car = d.cars.find((c) => c.id === req.params['id']);
      if (!car) return null;
      if (b.full) {
        Object.assign(car, cleanCar(b), { id: car.id });
        return car;
      }
      if (Number.isFinite(+b.pricePerDay) && +b.pricePerDay > 0) car.pricePerDay = Math.round(+b.pricePerDay);
      if (Number.isFinite(+b.units) && +b.units >= 0) car.units = Math.floor(+b.units);
      if (typeof b.active === 'boolean') car.active = b.active;
      if (typeof b.featured === 'boolean') car.featured = b.featured;
      if (typeof b.tagline === 'string') car.tagline = str(b.tagline, 80);
      if (typeof b.image === 'string') car.image = str(b.image, 300);
      return car;
    });
    if (!updated) {
      res.status(404).json({ error: tx('Not found') });
      return;
    }
    res.json(updated);
  });

  // Image upload (already resized in the browser). Body: { dataUrl }
  api.post('/admin/upload', requireAdmin, async (req, res) => {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
    if (!m) { res.status(400).json({ error: tx('Please upload a JPG, PNG or WebP image.') }); return; }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 8 * 1024 * 1024) { res.status(413).json({ error: tx('Image is too large (max 8 MB).') }); return; }
    // check the real file type, not just what the browser claims
    const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
    if (!(m[1] === 'jpeg' ? isJpg : m[1] === 'png' ? isPng : isWebp)) { res.status(400).json({ error: tx('That file is not a valid image.') }); return; }
    const name = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    await db.saveUpload(name, `image/${m[1]}`, buf);
    res.status(201).json({ url: `uploads/${name}` });
  });

  // Site content editors
  api.put('/admin/content/addons', requireAdmin, (req, res) => {
    const addons = cleanAddons(req.body, db.read().content.addons);
    db.write((d) => (d.content.addons = addons));
    applyAddons(addons);
    res.json(addons);
  });
  api.put('/admin/content/business', requireAdmin, (req, res) => {
    res.json(db.write((d) => (d.content.business = cleanBusiness(req.body || {}, d.content.business))));
  });
  // Everything, with all translations (for the editors)
  api.get('/admin/content', requireAdmin, (_req, res) => {
    res.json(db.read().content);
  });
  // Translations: PUT /admin/content/<about|faq|blog|cars>?lang=it
  api.put('/admin/content/:key', requireAdmin, (req, res, next) => {
    const lang = String(req.query['lang'] ?? '');
    const key = req.params['key'] as string;
    if (!isLang(lang) || lang === 'en') return next();
    if (!['about', 'faq', 'blog', 'cars'].includes(key)) { res.status(404).json({ error: tx('Not found') }); return; }
    const value =
      key === 'about' ? cleanAbout(req.body || {}) :
      key === 'faq' ? cleanFaq(req.body) :
      key === 'blog' ? Object.fromEntries(cleanBlog(req.body).map((p) => [p.slug, { title: p.title, excerpt: p.excerpt, tag: p.tag, coverAlt: p.cover.alt, body: p.body }])) :
      cleanCarTexts(req.body);
    db.write((d) => {
      const all = (d.content.i18n ??= {});
      (all[lang] ??= {})[key as 'about'] = value as never;
    });
    res.json(value);
  });
  api.put('/admin/content/about', requireAdmin, (req, res) => {
    res.json(db.write((d) => (d.content.about = cleanAbout(req.body || {}))));
  });
  api.put('/admin/content/faq', requireAdmin, (req, res) => {
    res.json(db.write((d) => (d.content.faq = cleanFaq(req.body))));
  });
  api.put('/admin/content/blog', requireAdmin, (req, res) => {
    res.json(db.write((d) => (d.content.blog = cleanBlog(req.body))));
  });

  // Redirects (old links → pages) and the list of links that found nothing
  /* ---------- settings: Resend key (write-only, encrypted), alert address, storage status ---------- */
  api.get('/admin/settings', requireAdmin, (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ...publicSettings(), sender: SENDER });
  });

  api.put('/admin/settings/email', requireAdmin, rateLimit('settings', 20, 10 * 60 * 1000), (req, res) => {
    const b = req.body || {};
    const key = typeof b.resendKey === 'string' ? b.resendKey.trim() : '';
    if (key && !RESEND_KEY_RE.test(key)) {
      res.status(400).json({ error: 'That does not look like a Resend API key. It starts with re_.' });
      return;
    }
    const owner = typeof b.ownerEmail === 'string' ? b.ownerEmail.trim().slice(0, 200) : undefined;
    if (owner && !isEmail(owner)) {
      res.status(400).json({ error: 'Enter a valid email for booking alerts.' });
      return;
    }
    db.write((d) => {
      const st = (d.settings ??= {});
      if (key) { st.resendKey = seal(key); st.resendKeyHint = '••••' + key.slice(-4); }
      if (b.removeKey === true) { delete st.resendKey; delete st.resendKeyHint; }
      if (owner !== undefined) st.ownerEmail = owner;
      st.updatedAt = now();
    });
    res.set('Cache-Control', 'no-store');
    res.json({ ...publicSettings(), sender: SENDER });
  });

  api.post('/admin/settings/test-email', requireAdmin, rateLimit('test-email', 5, 10 * 60 * 1000), async (req, res) => {
    const to = str(req.body?.to, 200);
    if (!isEmail(to)) { res.status(400).json({ error: 'Enter the email address to send the test to.' }); return; }
    const error = await sendTestEmail(to);
    if (error) { res.status(502).json({ error }); return; }
    res.json({ ok: true });
  });

  api.get('/admin/settings/preview', requireAdmin, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('html').send(previewEmail(req.query['kind'] === 'office' ? 'office' : 'guest'));
  });

  api.get('/admin/redirects', requireAdmin, (_req, res) => {
    const d = db.read();
    res.json({ redirects: d.content.redirects ?? [], missing: d.missing ?? [] });
  });
  api.put('/admin/redirects', requireAdmin, (req, res) => {
    const redirects = cleanRedirects(req.body);
    db.write((d) => {
      d.content.redirects = redirects;
      const done = new Set(redirects.map((r) => r.from.toLowerCase()));
      d.missing = (d.missing ?? []).filter((m) => !done.has(m.path.toLowerCase()));
    });
    res.json({ redirects, missing: db.read().missing ?? [] });
  });
  api.delete('/admin/missing', requireAdmin, (_req, res) => {
    db.write((d) => (d.missing = []));
    res.json({ ok: true });
  });

  api.get('/admin/messages', requireAdmin, (_req, res) => {
    res.json([...db.read().messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });

  api.patch('/admin/messages/:id', requireAdmin, (req, res) => {
    const m = db.write((d) => {
      const msg = d.messages.find((x) => x.id === req.params['id']);
      if (msg) msg.read = req.body?.read !== false;
      return msg;
    });
    if (!m) {
      res.status(404).json({ error: tx('Not found') });
      return;
    }
    res.json(m);
  });

  api.use((_req, res) => {
    res.status(404).json({ error: tx('Not found') });
  });

  // never leak stack traces to visitors
  api.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[kibabu] API error', err);
    res.status(err.status && err.status < 500 ? err.status : 500).json({ error: err.status === 413 ? tx('That file is too large.') : tx('Something went wrong. Please try again.') });
  });

  return api;
}
