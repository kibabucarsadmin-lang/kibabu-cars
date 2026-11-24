import { CUSTOM_T, LANGS, Lang, tx } from './i18n';
import { Car, PickupLocation } from './models';

/**
 * Single source of truth for business details.
 * Edit here and the whole site (header, footer, SEO, WhatsApp links) updates.
 */
export const BUSINESS = {
  name: 'Kibabu Cars Zanzibar',
  shortName: 'Kibabu Cars',
  phone: '+255 772 755 788',
  whatsapp: '255772755788', // digits only, used for wa.me links
  email: 'info@kibabucars.com',
  address: 'Stone Town, Zanzibar, Tanzania',
  poBox: 'P.O. Box 3445, Zanzibar',
  siteUrl: 'https://kibabucars.com',
  instagram: '', // set in Admin → Settings
  tiktok: '', // set in Admin → Settings
  facebook: 'https://www.facebook.com/Kibabulali/',
  tripadvisor:
    'https://www.tripadvisor.com/Attraction_Review-g482884-d15515966-Reviews-Kibabu_Cars_Zanzibar-Zanzibar_Island_Zanzibar_Archipelago.html',
  tripadvisorRating: 4.8,
  /** Moving background on the home page: a short, silent MP4 (Admin → Settings). Empty = slow photo flyover. */
  heroVideo: 'https://videos.pexels.com/video-files/13047294/13047294-hd_1920_1080_60fps.mp4', // free Pexels clip by Rudi De Ceuster; replace with your own drone footage
  stats: { years: 13, rentals: 1000, vehicles: 50 },
  /** Search Console + Bing verification codes and Google Analytics 4 ID (Admin → Settings) */
  googleVerification: '',
  bingVerification: '',
  gaId: '',
  /** Google Ads: account tag (AW-…) and the conversion label of the "Booking" conversion */
  adsId: '',
  adsLabel: '',
};

/** Booking rules – mirror the rules used on the WordPress site (functions.php snippets). */
export const RULES = {
  minDays: 2,
  longRentalFromDays: 7, // 7+ days: $5/day off (not the Juke)
  longRentalDiscountPerDay: 5,
  graceHours: 5, // extra 1–5 hours after the last full day are free (not the Juke); 6+ hours = 1 more day
  permitFeePerDriver: 25, // the permit extra (mandatory, cannot be removed)
  extraDriverFee: 0, // TODO: price per additional driver – confirm with Kibabu Cars
  maxExtraDrivers: 3,
  depositPercent: 50, // 50% online now, 50% cash or card on delivery
  minAge: 18,
  minLicenceYears: 1,
};

/** Extra services (same as the booking form on kibabucars.com). */
/** Name and description typed by the admin for one language (empty = built-in translation or English). */
export interface AddonText { label?: string; hint?: string }
export interface ExtraService {
  id: string; label: string; price: number; per: 'booking' | 'day';
  /** always added and charged (e.g. the driving permit) */
  locked?: boolean;
  hint?: string;
  /** Material icon name shown on the booking confirmation */
  icon?: string;
  /** false = hidden from the booking form (old bookings still show it) */
  active?: boolean;
  i18n?: Partial<Record<Lang, AddonText>>;
}
export interface InsuranceOption { id: string; label: string; pricePerDay: number; hint?: string; active?: boolean; i18n?: Partial<Record<Lang, AddonText>> }
/** Everything on the "Extras & prices" admin page. */
export interface Addons { extras: ExtraService[]; insurance: InsuranceOption[]; extraDriverFee: number }

export const EXTRAS: ExtraService[] = [
  { id: 'permit', label: tx('Zanzibar Driving Permit'), price: 25, per: 'booking', locked: true, hint: tx('Required by law. We arrange it for you.') },
  { id: 'cooler', label: tx('Cooler Box'), price: 5, per: 'booking', hint: tx('Keep drinks cold on beach days.') },
  { id: 'chauffeur', label: tx('Professional Chauffeur (Local Driver)'), price: 25, per: 'booking', hint: tx('A local driver who knows the island.') },
  { id: 'sim', label: tx('SIM Card'), price: 25, per: 'booking', hint: tx('Local data for maps and WhatsApp.') },
];
export const INSURANCE: InsuranceOption[] = [
  { id: 'mdp', label: tx('Optional Minor Damage Protection'), pricePerDay: 15, hint: tx('Extra cover for small damage.') },
];

/** The original extras, before any admin changes (used for new databases). */
export const DEFAULT_ADDONS: Addons = structuredClone({ extras: EXTRAS, insurance: INSURANCE, extraDriverFee: RULES.extraDriverFee });

/** Use the extras saved in the admin everywhere (booking form, prices, emails). Arrays are updated in place. */
export function applyAddons(a: Addons | undefined) {
  if (!a) return;
  EXTRAS.splice(0, EXTRAS.length, ...a.extras);
  INSURANCE.splice(0, INSURANCE.length, ...a.insurance);
  RULES.extraDriverFee = a.extraDriverFee;
  for (const l of LANGS) {
    if (l === 'en') continue;
    const map: Record<string, string> = {};
    for (const x of [...a.extras, ...a.insurance]) {
      const t = x.i18n?.[l];
      if (t?.label) map[x.label] = t.label;
      if (t?.hint && x.hint) map[x.hint] = t.hint;
    }
    CUSTOM_T[l] = map;
  }
}

/** Juke first, then cheapest to most expensive. */
export function sortFleet<T extends { pinned?: boolean; pricePerDay: number }>(cars: T[]): T[] {
  return [...cars].sort((a, b) => (a.pinned ? 0 : 1) - (b.pinned ? 0 : 1) || a.pricePerDay - b.pricePerDay);
}

export const LOCATIONS: PickupLocation[] = [
  { id: 'airport', label: tx('Zanzibar Airport (ZNZ)'), hint: tx('Meet & greet at arrivals'), fee: 0 },
  { id: 'stone-town', label: tx('Stone Town'), hint: tx('Hotel or address in town'), fee: 0 },
  { id: 'ferry', label: tx('Ferry Port'), hint: tx('Malindi ferry terminal'), fee: 0 },
  { id: 'hotel-town', label: tx('Hotel near town'), hint: tx('Within Zanzibar Town area'), fee: 0 },
  { id: 'coastal', label: tx('Coastal hotel / villa'), hint: tx('Nungwi, Kendwa, Paje, Jambiani, etc.'), fee: 20 },
];

export const CATEGORY_LABELS: Record<Car['category'], string> = {
  compact: tx('Compact SUV'),
  suv: tx('4x4 SUV'),
  family: tx('Family'),
  premium: tx('Premium'),
};

/** Seed fleet (from kibabucars.com). Seats/bags are typical values – confirm with the owner. */
export const SEED_CARS: Car[] = [
  {
    id: 'nissan-juke',
    name: 'Nissan Juke',
    tagline: 'Our most affordable ride',
    category: 'compact',
    body: 'crossover', color: '#f2643b',
    pricePerDay: 25,
    seats: 5, doors: 5, bags: 2,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: false, aircon: true,
    bestFor: 'Couples & budget travellers',
    description:
      'A stylish, easy-to-park crossover that sips fuel. Perfect for exploring Stone Town, beach hopping on the east coast and day trips on paved roads.',
    features: ['Air conditioning', 'Automatic gearbox', 'Bluetooth audio', 'Easy to park'],
    image: 'cars/nissan-juke.jpg', units: 4, active: true, featured: true, noDiscount: true, pinned: true,
  },
  {
    id: 'rav4-3-door',
    name: 'Toyota RAV4 3-Door',
    tagline: 'The classic Zanzibar 4x4',
    category: 'suv',
    body: 'suv3', color: '#2ec4b6',
    pricePerDay: 30,
    seats: 4, doors: 3, bags: 2,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Couples who want a 4x4',
    description:
      'Compact, tough and fun to drive. The 3-door RAV4 handles sandy beach roads and village tracks with ease.',
    features: ['4x4', 'Air conditioning', 'Automatic gearbox', 'High ground clearance'],
    image: 'cars/rav4-3-door.jpg', units: 8, active: true,
  },
  {
    id: 'suzuki-escudo',
    name: 'Suzuki Escudo 5-Door',
    tagline: 'Small, tough, practical',
    category: 'suv',
    body: 'suv', color: '#ffb547',
    pricePerDay: 30,
    seats: 5, doors: 5, bags: 2,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Small families & friends',
    description:
      'The Escudo (Grand Vitara) is a proven island favourite – compact 4x4 capability with five doors for easy access.',
    features: ['4x4', 'Air conditioning', 'Automatic gearbox', '5 doors'],
    image: 'cars/suzuki-escudo.jpg', units: 6, active: true, featured: true,
  },
  {
    id: 'rav4-5-door',
    name: 'Toyota RAV4 5-Door',
    tagline: 'Space for the whole crew',
    category: 'suv',
    body: 'suv', color: '#e9eef0',
    pricePerDay: 35,
    seats: 5, doors: 5, bags: 3,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Families of 4–5',
    description:
      'The most popular car on the island. Roomy, reliable and comfortable on every kind of Zanzibar road.',
    features: ['4x4', 'Air conditioning', 'Automatic gearbox', 'Large boot'],
    image: 'cars/rav4-5-door.jpg', units: 10, active: true, featured: true,
  },
  {
    id: 'rav4-new-shape',
    name: 'Toyota RAV4 New Shape',
    tagline: 'Modern comfort, 4x4 confidence',
    category: 'suv',
    body: 'suv', color: '#3b6e8f',
    pricePerDay: 40,
    seats: 5, doors: 5, bags: 3,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Families wanting a newer car',
    description:
      'A newer-generation RAV4 with a more refined ride, a bigger cabin and modern conveniences.',
    features: ['4x4', 'Air conditioning', 'Automatic gearbox', 'Newer model', 'Large boot'],
    image: 'cars/rav4-new-shape.jpg', units: 6, active: true, featured: true,
  },
  {
    id: 'toyota-vanguard',
    name: 'Toyota Vanguard',
    tagline: 'Extra room, smooth ride',
    category: 'family',
    body: 'suv', color: '#9aa5ab',
    pricePerDay: 40,
    seats: 5, doors: 5, bags: 4,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Families with luggage',
    description:
      'A longer, roomier SUV than the RAV4 with generous luggage space – ideal for families on a road-trip around the island.',
    features: ['4x4', 'Air conditioning', 'Automatic gearbox', 'Extra luggage space'],
    image: 'cars/toyota-vanguard.jpg', units: 4, active: true,
  },
  {
    id: 'toyota-harrier',
    name: 'Toyota Harrier',
    tagline: 'Refined comfort',
    category: 'premium',
    body: 'crossover', color: '#1f2a30',
    pricePerDay: 50,
    seats: 5, doors: 5, bags: 3,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: false, aircon: true,
    bestFor: 'Comfort seekers & honeymooners',
    description:
      'A premium crossover with a quiet cabin and plush seats – arrive at your resort in style.',
    features: ['Premium interior', 'Air conditioning', 'Automatic gearbox', 'Quiet ride'],
    image: 'cars/toyota-harrier.jpg', units: 3, active: true,
  },
  {
    id: 'toyota-alphard',
    name: 'Toyota Alphard',
    tagline: 'Room for everyone',
    category: 'family',
    body: 'van', color: '#f4f4f2',
    pricePerDay: 50,
    seats: 7, doors: 5, bags: 5,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: false, aircon: true,
    bestFor: 'Large families & groups',
    description:
      'A spacious luxury minivan with sliding doors and seating for the whole group. The best choice for big families.',
    features: ['7 seats', 'Sliding doors', 'Air conditioning', 'Automatic gearbox'],
    image: 'cars/toyota-alphard.jpg', units: 3, active: true, featured: true,
  },
  {
    id: 'land-cruiser-prado',
    name: 'Toyota Land Cruiser Prado',
    tagline: 'The ultimate island 4x4',
    category: 'premium',
    body: 'bigsuv', color: '#7b5b3a',
    pricePerDay: 100,
    seats: 7, doors: 5, bags: 4,
    transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true,
    bestFor: 'Groups who want comfort & power',
    description:
      'Legendary Land Cruiser toughness with premium comfort. Goes anywhere on the island with ease.',
    features: ['4x4', '7 seats', 'Premium interior', 'Air conditioning', 'Automatic gearbox'],
    image: 'cars/land-cruiser-prado.jpg', units: 2, active: true, featured: true,
  },
];

/**
 * Zanzibar scene photos (Unsplash licence, free to use). Each has a local fallback from
 * Kibabu's own fleet shoot, used if the remote photo can't load.
 */
export const PHOTOS = {
  ocean: { src: 'https://unsplash.com/photos/VqxfYDgg8RQ/download?w=1600', fallback: 'photos/seafront.jpg' },
  stoneTown: { src: 'https://unsplash.com/photos/0DDEIeraxMU/download?w=1600', fallback: 'photos/arrive.jpg' },
  beach: { src: 'https://unsplash.com/photos/G4zORfstMW0/download?w=1600', fallback: 'photos/seafront.jpg' },
  sunset: { src: 'https://unsplash.com/photos/YO0HyYcGLrU/download?w=1600', fallback: 'photos/hero.jpg' },
  aboutTown: { src: 'https://unsplash.com/photos/nkLfKiCf3EQ/download?w=1600', fallback: 'photos/stone-town.jpg' },
};

export function whatsappLink(message: string): string {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}
