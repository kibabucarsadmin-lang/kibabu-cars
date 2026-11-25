import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { DEFAULT_REDIRECTS, Redirect } from '../../shared/content';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SEED_CARS, sortFleet } from '../../shared/business';
import { SiteContent, defaultContent, localizeCars, slugify } from '../../shared/content';
import { isLang } from '../../shared/i18n';
import { AdminStats, Booking, BookingRequest, BookingStatus, Car, ContactMessage } from '../../shared/models';
import { calculateQuote, overlaps } from '../../shared/pricing';
import { SENDER, carPhotoUrl, guestEmail, officeEmail, sampleBooking, setEmailBase } from '../../shared/email';

/**
 * In-browser stand-in for src/server/api.ts, used only by the demo build so the
 * site can be tried on a phone without a server. Data lives in this browser only.
 */
const KEY = 'kb_demo_db_v4';
interface Db { cars: Car[]; bookings: Booking[]; messages: ContactMessage[]; content: SiteContent }
let mem: Db | null = null;

function load(): Db {
  if (mem) return mem;
  try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch { /* no storage */ }
  if (!mem) mem = { cars: structuredClone(SEED_CARS), bookings: [], messages: [], content: defaultContent() };
  if (!mem.content) mem.content = defaultContent();
  if (!mem.content.i18n) mem.content.i18n = defaultContent().i18n;
  mem.content.addons ??= defaultContent().addons;
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* ignore */ } }

const ok = <T>(body: T, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(250));
const fail = (status: number, error: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { error } }));
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const ref = () => 'KB-' + Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const ACTIVE: BookingStatus[] = ['pending', 'confirmed', 'active'];

function free(db: Db, car: Car, from: string, to: string) {
  return car.units - db.bookings.filter((b) => b.carId === car.id && ACTIVE.includes(b.status) && overlaps(b.pickupAt, b.returnAt, from, to)).length;
}
function isAdmin(req: HttpRequest<unknown>) {
  return req.headers.get('Authorization') === 'Bearer demo-token';
}

export const demoApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const db = load();
  const path = req.url.replace(/^\/api/, '').split('?')[0];
  const body = (req.body ?? {}) as Record<string, any>;
  const m = req.method;
  let r: Observable<any>;

  const hl = req.headers.get('x-kb-lang');
  const lang = isLang(hl) ? hl : 'en';
  if (m === 'GET' && path === '/cars') return ok(sortFleet(localizeCars(db.cars, db.content, lang).filter((c) => c.active)));
  if (m === 'GET' && path === '/content') return ok(db.content);
  if (m === 'GET' && path === '/availability') {
    const from = req.params.get('from')!, to = req.params.get('to')!;
    return ok(Object.fromEntries(db.cars.map((c) => [c.id, Math.max(free(db, c, from, to), 0)])));
  }
  if (m === 'POST' && path === '/bookings') {
    const b = body as BookingRequest;
    const car = db.cars.find((c) => c.id === b.carId);
    if (!car) return fail(400, 'Please choose a vehicle.');
    if (free(db, car, b.pickupAt, b.returnAt) < 1) return fail(409, `Sorry, the ${car.name} is fully booked for those dates.`);
    const booking: Booking = { ...b, customer: { ...b.customer, email: b.customer.email.toLowerCase() }, id: uid(), ref: ref(), status: 'confirmed',
      quote: calculateQuote(car, b), carName: car.name, createdAt: now(), updatedAt: now() };
    db.bookings.push(booking); save();
    return ok(booking, 201);
  }
  if (m === 'GET' && path === '/bookings/lookup') {
    const b = db.bookings.find((x) => x.ref === (req.params.get('ref') ?? '').toUpperCase() && x.customer.email === (req.params.get('email') ?? '').toLowerCase());
    return b ? ok(b) : fail(404, 'No booking found with that reference and email.');
  }
  if (m === 'POST' && path === '/bookings/cancel') {
    const b = db.bookings.find((x) => x.ref === String(body['ref']).toUpperCase() && x.customer.email === String(body['email']).toLowerCase());
    if (!b) return fail(404, 'Booking not found.');
    if (!['pending', 'confirmed'].includes(b.status)) return fail(400, 'This booking can no longer be cancelled online.');
    b.status = 'cancelled'; b.updatedAt = now(); save();
    return ok(b);
  }
  if (m === 'POST' && path === '/contact') {
    db.messages.push({ id: uid(), name: body['name'], email: body['email'], phone: body['phone'], message: body['message'], createdAt: now(), read: false });
    save(); return ok({ ok: true }, 201);
  }
  if (m === 'POST' && path === '/admin/login') {
    return body['password'] === 'kibabu-admin' ? ok({ token: 'demo-token' }) : fail(401, 'Wrong password. In the demo it is kibabu-admin');
  }
  if (path.startsWith('/admin/')) {
    if (!isAdmin(req)) return fail(401, 'Please log in again.');
    if (m === 'GET' && path === '/admin/stats') {
      const t = Date.now(), week = t + 7 * 864e5;
      const byStatus = { pending: 0, confirmed: 0, active: 0, completed: 0, cancelled: 0 } as Record<BookingStatus, number>;
      db.bookings.forEach((b) => byStatus[b.status]++);
      const s: AdminStats = {
        totalBookings: db.bookings.length, pending: byStatus.pending, activeRentals: byStatus.active,
        upcomingPickups: db.bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && +new Date(b.pickupAt) >= t && +new Date(b.pickupAt) <= week).length,
        revenueConfirmed: db.bookings.filter((b) => ['confirmed', 'active', 'completed'].includes(b.status)).reduce((a, b) => a + b.quote.total, 0),
        unreadMessages: db.messages.filter((x) => !x.read).length, byStatus,
        newToday: db.bookings.filter((b) => t - +new Date(b.createdAt) < 864e5).length,
      };
      return ok(s);
    }
    if (m === 'GET' && path === '/admin/bookings') return ok([...db.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    if (m === 'GET' && path === '/admin/cars') return ok(db.cars);
    if (m === 'GET' && path === '/admin/messages') return ok([...db.messages].reverse());
    const id = path.split('/').pop();
    if (m === 'PATCH' && path.startsWith('/admin/bookings/')) {
      const b = db.bookings.find((x) => x.id === id); if (!b) return fail(404, 'Not found');
      if (body['status']) b.status = body['status']; if (typeof body['adminNote'] === 'string') b.adminNote = body['adminNote'];
      b.updatedAt = now(); save(); return ok(b);
    }
    if (m === 'POST' && /^\/admin\/bookings\/[^/]+\/email$/.test(path)) {
      const b = db.bookings.find((x) => x.id === path.split('/')[3]); if (!b) return fail(404, 'Not found');
      return ok({ ok: true, to: b.customer.email });
    }
    if (m === 'POST' && path === '/admin/upload') return ok({ url: String(body['dataUrl']) }, 201); // demo: keep the image inline
    if (m === 'GET' && path === '/admin/content') return ok(db.content);
    if (path === '/admin/redirects') {
      if (m === 'PUT') { db.content.redirects = (req.body as Redirect[]).filter((r) => r.from && r.to); save(); }
      return ok({ redirects: db.content.redirects ?? DEFAULT_REDIRECTS, missing: [] });
    }
    if (m === 'DELETE' && path === '/admin/missing') return ok({ ok: true });
    if (path === '/admin/settings' || path === '/admin/settings/email') {
      // demo: the key itself is never kept in the browser, only its last 4 characters
      const st = ((db as any).settings ??= { hint: '', ownerEmail: '' });
      if (m === 'PUT') {
        const k = String(body['resendKey'] ?? '').trim();
        if (k && !/^re_[A-Za-z0-9_-]{10,200}$/.test(k)) return fail(400, 'That does not look like a Resend API key. It starts with re_.');
        if (k) st.hint = '••••' + k.slice(-4);
        if (body['removeKey'] === true) st.hint = '';
        if (typeof body['ownerEmail'] === 'string') st.ownerEmail = body['ownerEmail'].trim();
        save();
      }
      return ok({ sender: SENDER, email: { source: st.hint ? 'admin' : 'none', hint: st.hint, unreadable: false, ownerEmail: st.ownerEmail, ownerDefault: '', updatedAt: null }, database: { storage: 'demo', error: null } });
    }
    if (m === 'POST' && path === '/admin/settings/test-email') return fail(400, 'This demo does not send emails. On the live site the test email arrives in a few seconds.');
    if (m === 'GET' && path === '/admin/settings/preview') {
      setEmailBase(document.baseURI.replace(/[#?].*$/, ''));
      const car = db.cars.find((c) => c.active);
      const b = sampleBooking(car);
      const photo = carPhotoUrl(car?.image);
      return ok(req.params.get('kind') === 'office' ? officeEmail(b, photo) : guestEmail(b, undefined, 'en', photo));
    }
    const editLang = req.params.get('lang');
    if (m === 'PUT' && path.startsWith('/admin/content/') && isLang(editLang) && editLang !== 'en') {
      const k = path.split('/').pop() as 'about' | 'faq' | 'blog' | 'cars';
      const all = (db.content.i18n ??= {});
      (all[editLang] ??= {})[k] = req.body as any;
      save(); return ok(req.body);
    }
    if (m === 'PUT' && path.startsWith('/admin/content/')) {
      const k = path.split('/').pop() as keyof SiteContent;
      (db.content as any)[k] = k === 'business' ? { ...db.content.business, ...body } : req.body;
      save(); return ok((db.content as any)[k]);
    }
    if (m === 'POST' && path === '/admin/cars') {
      let cid = slugify(String(body['name'] || 'car')); let n = 2;
      while (db.cars.some((c) => c.id === cid)) cid = `${slugify(String(body['name']))}-${n++}`;
      const car = { ...(body as any), id: cid } as Car; delete (car as any).full;
      db.cars.push(car); save(); return ok(car, 201);
    }
    if (m === 'DELETE' && path.startsWith('/admin/cars/')) {
      if (db.bookings.some((b) => b.carId === id && ACTIVE.includes(b.status) && new Date(b.returnAt) > new Date())) return fail(409, 'This car has upcoming bookings. Take it offline instead.');
      db.cars = db.cars.filter((c) => c.id !== id); save(); return ok({ ok: true });
    }
    if (m === 'PUT' && path.startsWith('/admin/cars/') && body['full']) {
      const c = db.cars.find((x) => x.id === id); if (!c) return fail(404, 'Not found');
      const { full: _f, ...rest } = body; Object.assign(c, rest, { id: c.id }); save(); return ok(c);
    }
    if (m === 'PUT' && path.startsWith('/admin/cars/')) {
      const c = db.cars.find((x) => x.id === id); if (!c) return fail(404, 'Not found');
      Object.assign(c, { pricePerDay: +body['pricePerDay'] || c.pricePerDay, units: +body['units'] >= 0 ? +body['units'] : c.units,
        active: body['active'] ?? c.active, featured: body['featured'] ?? c.featured, image: body['image'] ?? c.image });
      save(); return ok(c);
    }
    if (m === 'PATCH' && path.startsWith('/admin/messages/')) {
      const x = db.messages.find((y) => y.id === id); if (!x) return fail(404, 'Not found');
      x.read = body['read'] !== false; save(); return ok(x);
    }
  }
  r = fail(404, 'Not found');
  return r;
};
