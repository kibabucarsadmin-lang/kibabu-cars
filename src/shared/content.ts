import { ABOUT, AboutContent } from './about';
import { BLOG, BlogPost } from './blog';
import { Addons, BUSINESS, DEFAULT_ADDONS, INFO_EMAIL, WHATSAPP, applyAddons } from './business';
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
  // general pages of the old WordPress site
  ['/rental-list', '/fleet'], ['/rental-grid', '/fleet'], ['/search-new', '/fleet'], ['/car-hire', '/fleet'], ['/rental', '/fleet'],
  ['/about-us', '/about'], ['/contact-us', '/contact'], ['/reviews', '/about'], ['/checkout', '/book'], ['/cart', '/book'],
  ['/my-account', '/my-booking'], ['/privacy-policy', '/terms'], ['/terms-and-conditions', '/terms'], ['/terms-conditions', '/terms'],
  ['/cars', '/fleet'], ['/car-type', '/fleet'], ['/shop', '/fleet'], ['/gallery', '/fleet'], ['/packages', '/fleet'], ['/listing-list', '/fleet'],
  ['/zanzibar-car-rental-prices-2026', '/fleet'], ['/car/toyota-noah', '/fleet'],
  ['/our-team', '/about'], ['/reviews/*', '/about'], ['/register', '/my-booking'], ['/login', '/my-booking'],
  ['/blog-list', '/blog'], ['/blog-list/*', '/blog'], ['/blog-grid', '/blog'], ['/category/*', '/blog'], ['/feed', '/blog'],
  ['/car-rental-insurance-in-zanzibar', '/faq'], ['/hidden-car-rental-fees-in-zanzibar', '/faq'],
  ['/zanzibar-airport-car-rental', '/'], ['/best-car-rental-in-zanzibar', '/'], ['/car-rental-in-paje', '/'], ['/taxi-service', '/'], ['/dreamsrentals-racing', '/'],
  ['/wp-content/uploads/2026/07/company-policy-8.pdf', '/terms'],
  ['/sitemap_index.xml', '/sitemap.xml'], ['/page-sitemap.xml', '/sitemap.xml'], ['/post-sitemap.xml', '/sitemap.xml'], ['/wp-sitemap.xml', '/sitemap.xml'],
  // old car pages → the same car
  ['/car/toyota-rav4', '/fleet/rav4-5-door'], ['/rental/toyota-rav4-5-door', '/fleet/rav4-5-door'], ['/rav4-rental-zanzibar', '/fleet/rav4-5-door'],
  ['/car/rav-4-new-model', '/fleet/rav4-new-shape'], ['/car/toyota-rav4-new-model', '/fleet/rav4-new-shape'], ['/rental/toyota-rav4-5-door-new-shape', '/fleet/rav4-new-shape'],
  ['/car/toyota-rav4-3-special', '/fleet/rav4-3-door'], ['/rental/toyota-rav4-3-door', '/fleet/rav4-3-door'],
  ['/car/suzuki-escudo', '/fleet/suzuki-escudo'], ['/car/suzuki-escudo-new-model', '/fleet/suzuki-escudo'], ['/rental/suzuki-escudo-5-doors', '/fleet/suzuki-escudo'],
  ['/car/toyota-harrier', '/fleet/toyota-harrier'], ['/rental/toyota-harrier', '/fleet/toyota-harrier'],
  ['/car/toyota-land-cruiser-prado', '/fleet/land-cruiser-prado'], ['/rental/toyota-land-cruiser-prado-120', '/fleet/land-cruiser-prado'],
  ['/rental/toyota-vanguard-5-door', '/fleet/toyota-vanguard'], ['/rental/toyota-alphard', '/fleet/toyota-alphard'],
  ['/rental/nissan-juke', '/fleet/nissan-juke'], ['/product/nissan-juke', '/fleet/nissan-juke'],
  ['/car/*', '/fleet'], ['/rental/*', '/fleet'], ['/product/*', '/fleet'],
  // old blog posts → the closest new guide
  ['/zanzibar-driving-permit-2026', '/blog/zanzibar-driving-permit'], ['/zanzibar-driving-permit', '/blog/zanzibar-driving-permit'],
  ['/zanzibar-road-conditions', '/blog/driving-in-zanzibar-tips'], ['/renting-a-car-in-zanzibar', '/blog/driving-in-zanzibar-tips'],
  ['/is-it-safe-to-drive-in-zanzibar', '/blog/driving-in-zanzibar-tips'], ['/is-it-safe-to-rent-a-car-in-zanzibar', '/blog/driving-in-zanzibar-tips'],
  ['/renting-a-car-in-zanzibar-vs-taxi', '/blog/driving-in-zanzibar-tips'],
  ['/driving-in-zanzibar-5-essential-tips-for-renting-a-car-and-exploring-the-island', '/blog/driving-in-zanzibar-tips'],
  ['/do-you-need-a-4x4-in-zanzibar', '/blog/which-car-for-zanzibar'],
  ['/best-places-to-visit-in-zanzibar-by-car', '/blog/one-week-zanzibar-road-trip'], ['/best-places-to-visit-zanzibar-by-car', '/blog/one-week-zanzibar-road-trip'],
  ['/best-places-to-visit-in-zanzibar-car-self-drive-road-trip-guide', '/blog/one-week-zanzibar-road-trip'], ['/best-places-to-visit-in-zanzibar/*', '/blog/one-week-zanzibar-road-trip'],
  ['/best-places-to-visit-in-by-car', '/blog/one-week-zanzibar-road-trip'],
  ['/top-7-hidden-beaches-in-zanzibar-you-can-only-reach-by-car', '/blog/one-week-zanzibar-road-trip'],
  ['/top-7-hidden-beaches-in-zanzibar-can-only-reach-by-car', '/blog/one-week-zanzibar-road-trip'], ['/top-7-hidden-beaches-zanzibar-only-reach-car', '/blog/one-week-zanzibar-road-trip'],
  ['/explore-zanzibars-beautiful-beaches-with-kibabu-cars', '/blog/one-week-zanzibar-road-trip'],
  ['/top-5-restaurants-in-zanzibar-with-secure-parking', '/blog'],
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
  // email and WhatsApp are fixed: saved values (old Gmail address, old numbers) never replace them
  if (c.business) Object.assign(BUSINESS, c.business, { stats: { ...BUSINESS.stats, ...c.business.stats }, email: INFO_EMAIL, whatsapp: WHATSAPP });
  if (c.addons) applyAddons(c.addons);
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
