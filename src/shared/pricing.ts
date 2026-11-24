import { fill } from './i18n';
import { EXTRAS, INSURANCE, LOCATIONS, RULES } from './business';
import { Car, LocationId, Quote, QuoteLine, QuoteMsg } from './models';

export interface QuoteInput {
  pickupAt: string | Date;
  returnAt: string | Date;
  pickupLocation: LocationId;
  returnLocation: LocationId;
  drivers: number;
  needPermit?: boolean; // ignored: the permit is mandatory
  babySeats: number;
  extras?: string[];
  insurance?: string | null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface DayCount { days: number; fullDays: number; extraHours: number; grace: boolean; }

/**
 * Rental days in 24-hour blocks from pickup.
 * Extra time after the last full day: under 1 hour is ignored; 1–5 hours is free
 * (grace period); 6 hours or more counts as one more day. The Juke (noDiscount)
 * has no grace period: any extra hour counts as a day.
 */
export function countDays(pickupAt: string | Date, returnAt: string | Date, noDiscount = false): DayCount {
  const ms = new Date(returnAt).getTime() - new Date(pickupAt).getTime();
  if (!isFinite(ms) || ms <= 0) return { days: 0, fullDays: 0, extraHours: 0, grace: false };
  const fullDays = Math.floor(ms / DAY);
  const extraHours = Math.floor((ms % DAY) / HOUR);
  if (fullDays === 0) return { days: 1, fullDays, extraHours, grace: false };
  if (extraHours === 0) return { days: fullDays, fullDays, extraHours, grace: false };
  if (!noDiscount && extraHours <= RULES.graceHours) return { days: fullDays, fullDays, extraHours, grace: true };
  return { days: fullDays + 1, fullDays, extraHours, grace: false };
}

/** Kept for older callers. */
export function rentalDays(pickupAt: string | Date, returnAt: string | Date): number {
  return countDays(pickupAt, returnAt).days;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateQuote(car: Pick<Car, 'pricePerDay'> & { noDiscount?: boolean }, input: QuoteInput): Quote {
  const warnings: string[] = [];
  const notes: string[] = [];
  const warningsI18n: QuoteMsg[] = [];
  const notesI18n: QuoteMsg[] = [];
  const warn = (t: string, p?: QuoteMsg['p']) => { warnings.push(fill(t, p)); warningsI18n.push({ t, p }); };
  const note = (t: string, p?: QuoteMsg['p']) => { notes.push(fill(t, p)); notesI18n.push({ t, p }); };
  const line = (t: string, p: QuoteMsg['p'] | undefined, amount: number): QuoteLine => ({ label: fill(t, p), amount, t, p });
  const count = countDays(input.pickupAt, input.returnAt, !!car.noDiscount);
  const days = Math.max(count.days, RULES.minDays);
  if (count.days > 0 && count.days < RULES.minDays) {
    warn('Minimum rental is {n} days, so this is priced as {n} days.', { n: RULES.minDays });
  }
  if (count.grace) {
    note(count.extraHours > 1 ? 'Grace period: your extra {h} hours are free.' : 'Grace period: your extra hour is free.', { h: count.extraHours });
  } else if (count.fullDays >= 1 && count.extraHours > 0 && count.days === count.fullDays + 1) {
    if (car.noDiscount) note('Extra {h} h counted as 1 more day (no grace period on this car).', { h: count.extraHours });
    else note('Your extra {h} hours are more than {g}, so they count as 1 more day.', { h: count.extraHours, g: RULES.graceHours });
  }

  const lines: QuoteLine[] = [line('{n} days × {price}', { n: days, price: '$' + car.pricePerDay }, days * car.pricePerDay)];

  const discountPerDay = !car.noDiscount && days >= RULES.longRentalFromDays ? RULES.longRentalDiscountPerDay : 0;
  if (discountPerDay) {
    lines.push(line('Long-term discount ({n} days × -{save})', { n: days, save: '$' + discountPerDay }, -days * discountPerDay));
  }

  const pickup = LOCATIONS.find((l) => l.id === input.pickupLocation);
  const drop = LOCATIONS.find((l) => l.id === input.returnLocation);
  if (pickup?.fee) lines.push(line('Coastal area fee – pickup', undefined, pickup.fee));
  if (drop?.fee) lines.push(line('Coastal area fee – drop-off', undefined, drop.fee));

  const drivers = Math.max(1, Math.floor(input.drivers || 1));
  const chosen = new Set(input.extras ?? []);
  for (const x of EXTRAS) {
    if (x.active === false || !(x.locked || chosen.has(x.id))) continue; // required extras are always charged
    const amount = x.per === 'day' ? x.price * days : x.price;
    lines.push(line(x.label, undefined, amount));
  }
  if (drivers > 1 && RULES.extraDriverFee > 0) {
    lines.push(line('Additional driver × {n}', { n: drivers - 1 }, (drivers - 1) * RULES.extraDriverFee));
  }
  const ins = INSURANCE.find((i) => i.id === input.insurance && i.active !== false);
  if (ins) lines.push(line('{name}: {n} days × {price}', { name: ins.label, n: days, price: '$' + ins.pricePerDay }, ins.pricePerDay * days));
  if (input.babySeats > 0) lines.push(line('Baby seat × {n}', { n: input.babySeats }, 0));

  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  const deposit = round2((total * RULES.depositPercent) / 100);
  return {
    days, dailyRate: car.pricePerDay - discountPerDay, lines, total, discountPerDay,
    deposit, balance: round2(total - deposit), notes, warnings, notesI18n, warningsI18n,
  };
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
