import { AboutContent } from '../shared/about';
import { Redirect, redirectPath } from '../shared/content';
import type { AddonText, Addons, ExtraService, InsuranceOption } from '../shared/business';
import { LANGS, Lang } from '../shared/i18n';
import { BlogPost } from '../shared/blog';
import { CarCategory, Car } from '../shared/models';
import { Business, CarText, slugify } from '../shared/content';
import { FaqGroup } from '../shared/faq';

/* Input sanitisers for admin-edited content. */
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min = 0, max = 1e6) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;
};
const url = (v: unknown) => {
  const s = str(v, 400);
  return /^https?:\/\//i.test(s) ? s : '';
};
const img = (v: unknown) => {
  const s = str(v, 400);
  return /^(https?:\/\/|uploads\/|cars\/|photos\/|data:image\/)/.test(s) ? s : '';
};
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function cleanBusiness(b: Record<string, any>, prev: Business): Business {
  return {
    ...prev,
    name: str(b['name'], 80) || prev.name,
    shortName: str(b['shortName'], 40) || prev.shortName,
    phone: str(b['phone'], 30) || prev.phone,
    whatsapp: str(b['whatsapp'], 20).replace(/\D/g, '') || prev.whatsapp,
    email: str(b['email'], 120) || prev.email,
    address: str(b['address'], 160) || prev.address,
    poBox: str(b['poBox'], 80),
    instagram: url(b['instagram']),
    tiktok: url(b['tiktok']),
    facebook: url(b['facebook']),
    tripadvisor: url(b['tripadvisor']),
    tripadvisorRating: num(b['tripadvisorRating'], 0, 5),
    heroVideo: (() => { const v = str(b['heroVideo'], 300); return /^(https:\/\/[^\s"'<>]+|\/?[A-Za-z0-9_\/.-]+)\.(mp4|webm)(\?[^\s"'<>]*)?$/i.test(v) && !v.includes('..') ? v : ''; })(),
    googleVerification: str(b['googleVerification'], 120).replace(/[^A-Za-z0-9_-]/g, ''),
    bingVerification: str(b['bingVerification'], 120).replace(/[^A-Za-z0-9_-]/g, ''),
    gaId: /^G-[A-Z0-9]{4,20}$/.test(str(b['gaId'], 30).toUpperCase()) ? str(b['gaId'], 30).toUpperCase() : '',
    adsId: /^AW-\d{6,15}$/.test(str(b['adsId'], 30).toUpperCase()) ? str(b['adsId'], 30).toUpperCase() : '',
    adsLabel: /^[A-Za-z0-9_-]{4,64}$/.test(str(b['adsLabel'], 64)) ? str(b['adsLabel'], 64) : '',
    stats: {
      years: Math.round(num(b['stats']?.years, 0, 200)),
      rentals: Math.round(num(b['stats']?.rentals, 0, 1e7)),
      vehicles: Math.round(num(b['stats']?.vehicles, 0, 1e4)),
    },
  };
}

export function cleanAbout(a: Record<string, any>): AboutContent {
  return {
    heroTitle: str(a['heroTitle'], 160),
    storyTitle: str(a['storyTitle'], 120),
    story: arr<string>(a['story']).map((p) => str(p, 3000)).filter(Boolean).slice(0, 12),
    valuesTitle: str(a['valuesTitle'], 120),
    values: arr<any>(a['values']).map((v) => ({ t: str(v?.t, 80), d: str(v?.d, 400) })).filter((v) => v.t).slice(0, 8),
  };
}

export function cleanFaq(v: unknown): FaqGroup[] {
  return arr<any>(v).slice(0, 30).map((g) => ({
    id: slugify(str(g?.id, 60) || str(g?.title, 60)) || 'topic',
    title: str(g?.title, 80),
    icon: str(g?.icon, 40) || 'help',
    items: arr<any>(g?.items).map((i) => ({ q: str(i?.q, 300), a: str(i?.a, 3000) })).filter((i) => i.q && i.a).slice(0, 60),
  })).filter((g) => g.title);
}

export function cleanBlog(v: unknown): BlogPost[] {
  const seen = new Set<string>();
  return arr<any>(v).slice(0, 300).map((p) => {
    let slug = slugify(str(p?.slug, 80) || str(p?.title, 80)) || 'post';
    while (seen.has(slug)) slug += '-2';
    seen.add(slug);
    return {
      slug,
      title: str(p?.title, 160),
      excerpt: str(p?.excerpt, 400),
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(p?.date, 10)) ? str(p?.date, 10) : new Date().toISOString().slice(0, 10),
      minutes: Math.round(num(p?.minutes, 1, 60)),
      tag: str(p?.tag, 40) || 'Travel',
      cover: { src: img(p?.cover?.src), fallback: img(p?.cover?.fallback) || undefined, alt: str(p?.cover?.alt, 160) || str(p?.title, 160) },
      body: arr<any>(p?.body).slice(0, 200).map((b) => {
        if (b?.h) return { h: str(b.h, 160) };
        if (b?.list) return { list: arr<string>(b.list).map((l) => str(l, 600)).filter(Boolean) };
        if (b?.tip) return { tip: str(b.tip, 800) };
        return { p: str(b?.p, 4000) };
      }).filter((b) => b.h || b.p || b.tip || b.list?.length),
    };
  }).filter((p) => p.title);
}

const CATS: CarCategory[] = ['compact', 'suv', 'family', 'premium'];
export function cleanCar(c: Record<string, any>): Omit<Car, 'id'> & { id?: string } {
  return {
    name: str(c['name'], 80),
    tagline: str(c['tagline'], 100),
    category: CATS.includes(c['category']) ? c['category'] : 'suv',
    pricePerDay: Math.round(num(c['pricePerDay'], 0, 10000)),
    seats: Math.round(num(c['seats'], 1, 20)),
    doors: Math.round(num(c['doors'], 2, 6)),
    bags: Math.round(num(c['bags'], 0, 20)),
    transmission: c['transmission'] === 'Manual' ? 'Manual' : 'Automatic',
    fuel: c['fuel'] === 'Diesel' ? 'Diesel' : 'Petrol',
    fourByFour: !!c['fourByFour'],
    aircon: c['aircon'] !== false,
    bestFor: str(c['bestFor'], 100),
    description: str(c['description'], 3000),
    features: arr<string>(c['features']).map((f) => str(f, 60)).filter(Boolean).slice(0, 20),
    image: img(c['image']),
    units: Math.round(num(c['units'], 0, 500)),
    active: c['active'] !== false,
    featured: !!c['featured'],
    noDiscount: !!c['noDiscount'],
    pinned: !!c['pinned'],
  };
}

/** Translated car texts: { [carId]: { tagline, bestFor, description, features } } */
export function cleanCarTexts(v: unknown): Record<string, CarText> {
  const out: Record<string, CarText> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [id, x] of Object.entries(v as Record<string, any>).slice(0, 200)) {
    if (!/^[a-z0-9-]{1,80}$/.test(id) || !x || typeof x !== 'object') continue;
    out[id] = {
      tagline: str(x.tagline, 160),
      bestFor: str(x.bestFor, 200),
      description: str(x.description, 2000),
      features: Array.isArray(x.features) ? x.features.map((f: unknown) => str(f, 120)).filter(Boolean).slice(0, 20) : [],
    };
  }
  return out;
}

/** Redirects from Admin: tidy paths, drop empties, loops, duplicates and protected paths. */
export function cleanRedirects(input: unknown): Redirect[] {
  const list = Array.isArray(input) ? input.slice(0, 500) : [];
  const out: Redirect[] = [];
  const seen = new Set<string>();
  for (const r of list) {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const from = redirectPath(String(o['from'] ?? ''));
    const rawTo = String(o['to'] ?? '').trim().slice(0, 300);
    const to = /^https:\/\/[^\s<>"']+$/i.test(rawTo) ? rawTo : redirectPath(rawTo);
    if (!from || !to || from === '/' || from === to || seen.has(from.toLowerCase())) continue;
    if (/^\/(api|admin|uploads|media)(\/|$)/i.test(from)) continue;
    seen.add(from.toLowerCase());
    out.push({ from, to });
  }
  return out;
}

const ICONS = new Set(['badge', 'kitchen', 'person_pin', 'sim_card', 'child_care', 'wifi', 'beach_access', 'scuba_diving', 'surfing', 'kayaking', 'restaurant', 'hiking', 'luggage', 'local_gas_station', 'flight', 'map', 'camera_alt', 'shield', 'add_circle', 'directions_car', 'local_shipping', 'umbrella']);

/** Extras & prices from Admin. Unknown fields dropped, prices kept in a sane range, ids stable. */
export function cleanAddons(input: unknown, prev?: Addons): Addons {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const money = (v: unknown, max = 5000) => { const n = Math.round(Number(v) * 100) / 100; return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
  const text = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[<>]/g, '').trim().slice(0, n) : '');
  const texts = (v: unknown) => {
    const src = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const out: Partial<Record<Lang, AddonText>> = {};
    for (const l of LANGS) {
      if (l === 'en') continue;
      const t = (src[l] ?? {}) as Record<string, unknown>;
      const label = text(t['label'], 80), hint = text(t['hint'], 160);
      if (label || hint) out[l] = { ...(label ? { label } : {}), ...(hint ? { hint } : {}) };
    }
    return out;
  };
  const used = new Set<string>();
  const idFor = (raw: unknown, label: string) => {
    let id = (typeof raw === 'string' && /^[a-z0-9-]{1,40}$/.test(raw) ? raw : '') || slugify(label).slice(0, 40) || 'extra';
    const base = id; let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };
  const extras: ExtraService[] = (Array.isArray(o['extras']) ? o['extras'] : []).slice(0, 30).flatMap((r: unknown) => {
    const x = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const label = text(x['label'], 80);
    if (!label) return [];
    const icon = typeof x['icon'] === 'string' && ICONS.has(x['icon']) ? x['icon'] : undefined;
    return [{
      id: idFor(x['id'], label), label, hint: text(x['hint'], 160), price: money(x['price']),
      per: x['per'] === 'day' ? 'day' as const : 'booking' as const,
      locked: x['locked'] === true, active: x['active'] !== false, ...(icon ? { icon } : {}), i18n: texts(x['i18n']),
    }];
  });
  const insurance: InsuranceOption[] = (Array.isArray(o['insurance']) ? o['insurance'] : []).slice(0, 6).flatMap((r: unknown) => {
    const x = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const label = text(x['label'], 80);
    if (!label) return [];
    return [{ id: idFor(x['id'], label), label, hint: text(x['hint'], 160), pricePerDay: money(x['pricePerDay'], 500), active: x['active'] !== false, i18n: texts(x['i18n']) }];
  });
  const fee = o['extraDriverFee'] === undefined ? prev?.extraDriverFee ?? 0 : money(o['extraDriverFee'], 500);
  return { extras, insurance, extraDriverFee: fee };
}
