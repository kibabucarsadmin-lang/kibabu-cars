// Types shared by the Angular app and the Express API (src/server.ts).

export type CarCategory = 'compact' | 'suv' | 'family' | 'premium';
export type BodyStyle = 'crossover' | 'suv3' | 'suv' | 'van' | 'bigsuv';

export interface Car {
  id: string;
  name: string;
  tagline: string;
  category: CarCategory;
  body?: BodyStyle;
  color?: string;
  pricePerDay: number; // USD
  seats: number;
  doors: number;
  bags: number;
  transmission: 'Automatic' | 'Manual';
  fuel: 'Petrol' | 'Diesel';
  fourByFour: boolean;
  aircon: boolean;
  bestFor: string;
  description: string;
  features: string[];
  image: string; // e.g. 'cars/rav4-5-door.jpg' (file in public/cars, plus a 600px '-sm.jpg' copy)
  units: number; // how many of this model are in the fleet
  active: boolean;
  featured?: boolean;
  /** No long-rental or grace-period discount (the Juke: already the lowest price). */
  noDiscount?: boolean;
  /** Always listed first (the Juke). */
  pinned?: boolean;
}

export type LocationId = 'airport' | 'stone-town' | 'ferry' | 'hotel-town' | 'coastal';

export interface PickupLocation {
  id: LocationId;
  label: string;
  hint: string;
  fee: number; // USD, one way
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PaymentMethod = 'arrival' | 'online';

export interface BookingRequest {
  /** language the guest booked in (emails are sent in it) */
  lang?: string;
  /** spam trap – always empty for real people */
  website?: string;
  carId: string;
  pickupAt: string; // ISO datetime
  returnAt: string; // ISO datetime
  pickupLocation: LocationId;
  returnLocation: LocationId;
  pickupDetails?: string; // hotel name / flight number
  passportNumber?: string; // required for airport pickup/drop-off
  drivers: number; // total authorised drivers (1 + additional drivers)
  extras?: string[]; // ids from EXTRAS (permit is always added)
  insurance?: string | null; // id from INSURANCE or null
  needPermit: boolean;
  babySeats: number;
  customer: {
    name: string;
    email: string;
    phone: string; // WhatsApp number
    country: string;
  };
  notes?: string;
  paymentMethod: PaymentMethod;
}

export interface QuoteLine {
  label: string;
  amount: number;
  /** English template + values, so the line can be shown in the visitor's language */
  t?: string;
  p?: Record<string, string | number>;
}
export interface QuoteMsg { t: string; p?: Record<string, string | number> }

export interface Quote {
  days: number;
  dailyRate: number;
  lines: QuoteLine[];
  total: number;
  discountPerDay: number;
  /** 50% paid online to secure the booking, 50% cash or card on delivery */
  deposit: number;
  balance: number;
  /** Notes about how time was counted (grace period, extra day) */
  notes: string[];
  warnings: string[];
  notesI18n?: QuoteMsg[];
  warningsI18n?: QuoteMsg[];
}

export interface Booking extends BookingRequest {
  id: string;
  ref: string; // e.g. KB-7F3K2
  status: BookingStatus;
  quote: Quote;
  carName: string;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AdminStats {
  totalBookings: number;
  pending: number;
  upcomingPickups: number;
  activeRentals: number;
  revenueConfirmed: number;
  newToday: number;
  unreadMessages: number;
  byStatus: Record<BookingStatus, number>;
}
