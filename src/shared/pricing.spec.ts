import { describe, expect, it } from 'vitest';
import { calculateQuote, countDays, overlaps } from './pricing';

const at = (day: number, hour = 10) => new Date(Date.UTC(2027, 0, day, hour)).toISOString();
const base = { pickupLocation: 'airport' as const, returnLocation: 'airport' as const, drivers: 1, babySeats: 0 };
const total = (lines: { amount: number }[]) => lines.reduce((s, l) => s + l.amount, 0);

describe('countDays (grace period)', () => {
  it('counts whole 24-hour blocks', () => expect(countDays(at(1), at(4)).days).toBe(3));
  it('gives 1–5 extra hours free', () => {
    const c = countDays(at(1), at(4, 15));
    expect(c.days).toBe(3);
    expect(c.grace).toBe(true);
  });
  it('charges a day for 6+ extra hours', () => expect(countDays(at(1), at(4, 16)).days).toBe(4));
  it('has no grace period for the Juke', () => expect(countDays(at(1), at(4, 11), true).days).toBe(4));
  it('returns 0 for a return before pickup', () => expect(countDays(at(4), at(1)).days).toBe(0));
});

describe('calculateQuote', () => {
  it('always adds the $25 driving permit', () => {
    const q = calculateQuote({ pricePerDay: 30 }, { ...base, pickupAt: at(1), returnAt: at(4) });
    expect(q.lines.find((l) => /permit/i.test(l.label))?.amount).toBe(25);
    expect(q.total).toBe(3 * 30 + 25);
  });
  it('enforces the 2-day minimum', () => {
    const q = calculateQuote({ pricePerDay: 30 }, { ...base, pickupAt: at(1), returnAt: at(1, 20) });
    expect(q.days).toBe(2);
    expect(q.warnings.length).toBe(1);
  });
  it('takes $5/day off from 7 days', () => {
    const q = calculateQuote({ pricePerDay: 40 }, { ...base, pickupAt: at(1), returnAt: at(8) });
    expect(q.discountPerDay).toBe(5);
    expect(q.total).toBe(7 * 35 + 25);
  });
  it('gives no long-term discount on the Juke', () => {
    const q = calculateQuote({ pricePerDay: 25, noDiscount: true }, { ...base, pickupAt: at(1), returnAt: at(8) });
    expect(q.discountPerDay).toBe(0);
    expect(q.total).toBe(7 * 25 + 25);
  });
  it('adds $20 coastal fee for each coastal leg', () => {
    const q = calculateQuote({ pricePerDay: 30 }, { ...base, pickupLocation: 'coastal', returnLocation: 'coastal', pickupAt: at(1), returnAt: at(4) });
    expect(q.total).toBe(90 + 25 + 40);
  });
  it('prices extras and insurance per day', () => {
    const q = calculateQuote({ pricePerDay: 30 }, { ...base, extras: ['cooler', 'sim'], insurance: 'mdp', pickupAt: at(1), returnAt: at(4) });
    expect(q.total).toBe(90 + 25 + 5 + 25 + 3 * 15);
  });
  it('ignores unknown extras', () => {
    const q = calculateQuote({ pricePerDay: 30 }, { ...base, extras: ['free-car'], pickupAt: at(1), returnAt: at(4) });
    expect(q.total).toBe(115);
  });
  it('splits 50/50 and the halves add up', () => {
    const q = calculateQuote({ pricePerDay: 33 }, { ...base, pickupAt: at(1), returnAt: at(4) });
    expect(q.deposit + q.balance).toBe(q.total);
    expect(total(q.lines)).toBe(q.total);
  });
});

describe('overlaps', () => {
  it('detects overlapping bookings', () => expect(overlaps(at(1), at(5), at(4), at(8))).toBe(true));
  it('allows back-to-back bookings', () => expect(overlaps(at(1), at(5), at(5), at(8))).toBe(false));
});
