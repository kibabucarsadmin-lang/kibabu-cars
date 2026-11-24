import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from './config';
import { notifyBooking } from './mail';
import { Booking } from '../shared/models';

const booking = {
  ref: 'KB-TEST1', carName: 'RAV4', carId: 'rav4', status: 'confirmed', drivers: 2, babySeats: 0,
  pickupAt: '2027-01-01T08:00:00Z', returnAt: '2027-01-05T08:00:00Z', pickupLocation: 'airport', returnLocation: 'airport',
  extras: ['cooler'], insurance: 'mdp', needPermit: true, paymentMethod: 'card',
  customer: { name: 'Amina <b>', email: 'amina@example.com', phone: '+255', country: 'Tanzania' },
  quote: { days: 4, lines: [{ label: 'Cooler Box', amount: 5 }], total: 100, deposit: 50, balance: 50 },
} as unknown as Booking;

describe('booking emails via Resend', () => {
  afterEach(() => { vi.unstubAllGlobals(); CONFIG.resendKey = ''; });

  it('sends the owner alert and the customer confirmation with extras', async () => {
    CONFIG.resendKey = 're_test';
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await notifyBooking(booking);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers['Idempotency-Key']).toBe('booking-owner/KB-TEST1');
    const body = JSON.parse(init.body);
    expect(body.html).toContain('Cooler Box');
    expect(body.html).toContain('Amina &lt;b&gt;'); // escaped
    expect(body.reply_to).toBe('amina@example.com');
    expect(body.from).toBe('Kibabu Cars Zanzibar <info@kibabucars.com>');
    expect(JSON.parse(fetch.mock.calls[1][1].body).to).toEqual(['amina@example.com']);
  });

  it('writes the customer email in the language they booked in (office copy stays English)', async () => {
    CONFIG.resendKey = 're_test';
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await notifyBooking({ ...booking, lang: 'it' } as Booking);
    const owner = JSON.parse(fetch.mock.calls[0][1].body);
    const guest = JSON.parse(fetch.mock.calls[1][1].body);
    expect(owner.subject).toContain('New booking');
    expect(guest.subject).toBe('La tua prenotazione Kibabu Cars KB-TEST1 è confermata');
    expect(guest.html).toContain('lang="it"');
    expect(guest.html).toContain('Borsa frigo');
  });

  it('retries on a Resend outage and never throws', async () => {
    CONFIG.resendKey = 're_test';
    const fetch = vi.fn().mockResolvedValue(new Response('down', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    const done = notifyBooking(booking);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(6); // 3 tries × 2 emails
    vi.useRealTimers();
  });

  it('does nothing when no email service is set up', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await notifyBooking(booking);
    expect(fetch).not.toHaveBeenCalled();
  });
});
