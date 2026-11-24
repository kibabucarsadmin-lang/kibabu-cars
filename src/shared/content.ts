import { ABOUT, AboutContent } from './about';
import { BLOG, BlogPost } from './blog';
import { Addons, BUSINESS, DEFAULT_ADDONS, applyAddons } from './business';
import { FAQ, FaqGroup } from './faq';
import { BlogBlock } from './blog';
import { Lang } from './i18n';
import { Car } from './models';
import { DEFAULT_TRANSLATIONS } from './i18n/content';

export type Business = typeof BUSINESS;

/** Everything the admin can edit (besides cars & bookings). */
export interface SiteContent {
  business: Business;
  about: AboutContent;
  faq: FaqGroup[];
  blog: BlogPost[];
  /** Extra services, damage protection and the additional-driver price (Admin → Extras & prices). */
  addons?: Addons;
  /** Old links that send visitors on to a page of this site (301). Managed in Admin → Redirects. */
  redirects?: Redirect[];
  /** Translations of the above (and of car texts). English is the source; anything missing falls back to it. */
  i18n?: Partial<Record<Lang, LocalizedContent>>;
}

export interface Redirect { from: string; to: string }
/** A link someone opened that found no page (shown in Admin → Redirects). */
export interface MissingLink { path: string; hits: number; last: string }

/** Links of the old WordPress site, so Google rankings and bookmarks keep working. */
export const DEFAULT_REDIRECTS: Redirect[] = [
  ['/rental-list', '/fleet'], ['/rental-grid', '/fleet'], ['/search-new', '/fleet'], ['/car-hire', '/fleet'], ['/rental', '/fleet'],
  ['/about-us', '/about'], ['/contact-us', '/contact'], ['/reviews', '/about'], ['/checkout', '/book'], ['/cart', '/book'],
  ['/my-account', '/my-booking'], ['/privacy-policy', '/terms'], ['/terms-and-conditions', '/terms'], ['/terms-conditions', '/terms'],
].map(([from, to]) => ({ from, to }));

/** "https://kibabucars.com/Old-Page/?x=1" → "/Old-Page". Returns '' if it is not a usable path. */
export function redirectPath(input: string): string {
  let s = String(input ?? '').trim();
  s = s.replace(/^https?:\/\/[^/]+/i, '');
  s = s.split(/[?#]/)[0];
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  try { s = decodeURI(s); } catch { /* keep as typed */ }
  return /^\/[^\s<>"'\\]{0,200}$/.test(s) ? s : '';
}

export interface BlogText { title: string; excerpt: string; tag?: string; coverAlt?: string; body: BlogBlock[] }
export interface CarText { tagline?: string; bestFor?: string; description?: string; features?: string[] }
export interface LocalizedContent {
  about?: AboutContent;
  faq?: FaqGroup[];
  /** by post slug */
  blog?: Record<string, BlogText>;
  /** by car id */
  cars?: Record<string, CarText>;
}

/** Content as seen in one language (no i18n field: smaller to send to the browser). */
export function localizeContent(c: SiteContent, lang: Lang): SiteContent {
  const { i18n, ...base } = c;
  const t = lang === 'en' ? undefined : i18n?.[lang];
  if (!t) return base;
  return {
    ...base,
    about: t.about ?? base.about,
    faq: t.faq?.length ? t.faq : base.faq,
    blog: base.blog.map((p) => {
      const x = t.blog?.[p.slug];
      if (!x) return p;
      return { ...p, title: x.title || p.title, excerpt: x.excerpt || p.excerpt, tag: x.tag || p.tag, body: x.body?.length ? x.body : p.body, cover: { ...p.cover, alt: x.coverAlt || p.cover.alt } };
    }),
  };
}

export function localizeCars(cars: Car[], c: SiteContent, lang: Lang): Car[] {
  const t = lang === 'en' ? undefined : c.i18n?.[lang]?.cars;
  if (!t) return cars;
  return cars.map((car) => {
    const x = t[car.id];
    if (!x) return car;
    return { ...car, tagline: x.tagline || car.tagline, bestFor: x.bestFor || car.bestFor, description: x.description || car.description, features: x.features?.length ? x.features : car.features };
  });
}

export function defaultContent(): SiteContent {
  return structuredClone({ business: BUSINESS, about: ABOUT, faq: FAQ, blog: BLOG, addons: DEFAULT_ADDONS, redirects: DEFAULT_REDIRECTS, i18n: DEFAULT_TRANSLATIONS });
}

/**
 * Copy the business details (phone, WhatsApp, socials – the same in every language) into the
 * shared object used by helpers like whatsappLink and the footer. Language-dependent content
 * (About, FAQ, blog) lives in ContentStore instead, so two visitors in different languages
 * rendered at the same time on the server never see each other's text.
 */
export function applyContent(c: Partial<SiteContent>) {
  if (c.business) Object.assign(BUSINESS, c.business, { stats: { ...BUSINESS.stats, ...c.business.stats } });
  if (c.addons) applyAddons(c.addons);
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
