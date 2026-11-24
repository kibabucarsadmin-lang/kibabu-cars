import nodemailer, { Transporter } from 'nodemailer';
import { BUSINESS } from '../shared/business';
import { SENDER, Tr, carPhotoUrl, day, guestEmail, messageEmail, officeEmail, sampleBooking as sample } from '../shared/email';
import { Booking, ContactMessage } from '../shared/models';
import { CONFIG } from './config';
import { db } from './db';
import { ownerEmail, resendKey } from './settings';
import { Lang, isLang, loadDict, translate } from '../shared/i18n';

/**
 * Booking / contact emails.
 * Sent with Resend (RESEND_API_KEY) – or plain SMTP as a fallback.
 * With neither configured, emails are skipped and bookings still work.
 */
let transport: Transporter | null = null;
function mailer(): Transporter | null {
  if (!CONFIG.smtp.host) return null;
  transport ??= nodemailer.createTransport({
    host: CONFIG.smtp.host, port: CONFIG.smtp.port, secure: CONFIG.smtp.secure,
    auth: CONFIG.smtp.user ? { user: CONFIG.smtp.user, pass: CONFIG.smtp.pass } : undefined,
  });
  return transport;
}

interface Mail { from: string; to: string; replyTo?: string; subject: string; html: string }

const enabled = () => !!(resendKey() || CONFIG.smtp.host);

/** Sends one email. Never throws: a failed email must not break a booking. Returns the error, if any. */
async function send(mail: Mail, idempotencyKey: string): Promise<string | null> {
  // a line break in a guest's name must never add email headers (SMTP); subjects are one plain line
  mail = { ...mail, subject: mail.subject.replace(/[\r\n]+/g, ' ').slice(0, 200) };
  try {
    const apiKey = resendKey();
    if (apiKey) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            // Resend drops a repeat with the same key (24h), so retries never send twice
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, html: mail.html }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) return null;
        const retry = res.status === 429 || res.status >= 500;
        if (!retry || attempt === 3) {
          const text = (await res.text()).slice(0, 300);
          console.error(`[kibabu] Resend refused "${mail.subject}" (${res.status}):`, text);
          let why = text;
          try { why = JSON.parse(text).message || text; } catch { /* plain text */ }
          return `Resend ${res.status}: ${why}`;
        }
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
      return null;
    }
    const m = mailer();
    if (!m) return 'No email service is set up.';
    await m.sendMail(mail);
    return null;
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[kibabu] email "${mail.subject}" failed:`, msg);
    return /fetch failed|ENOTFOUND|ECONNREFUSED|timeout|aborted/i.test(msg) ? `Could not reach Resend (${msg}). Check the server's internet connection and try again.` : msg;
  }
}

const owner = () => ownerEmail(BUSINESS.email);
const from = () => SENDER;
export { SENDER, guestEmail, officeEmail };

/** the booked car's photo as a full URL, if we have one */
function photoOf(b: Booking): string | null {
  try {
    return carPhotoUrl(db.read().cars.find((c) => c.id === b.carId)?.image);
  } catch {
    return null;
  }
}

export function sampleBooking(): Booking {
  let car;
  try { car = db.read().cars.find((c) => c.active); } catch { /* no data yet */ }
  return sample(car);
}

/** Preview HTML for the admin. */
export function previewEmail(kind: 'guest' | 'office'): string {
  const b = sampleBooking();
  const html = kind === 'office' ? officeEmail(b, photoOf(b)) : guestEmail(b, undefined, 'en', photoOf(b));
  // in the admin preview, load the logo and photo from the site the admin is on
  return html.split(`src="${BUSINESS.siteUrl.replace(/\/$/, '')}/`).join('src="/');
}

export async function notifyBooking(b: Booking): Promise<void> {
  if (!enabled()) return;
  // the customer gets their email in the language they booked in; the office gets English
  const lang: Lang = isLang(b.lang) ? b.lang : 'en';
  const dict = await loadDict(lang);
  const t: Tr = (s, p) => translate(dict, s, p, lang);
  try {
    await send({
      from: from(), to: owner(), replyTo: b.customer.email,
      subject: `New booking ${b.ref}: ${b.customer.name}, ${b.carName}, ${day(b.pickupAt)}`,
      html: officeEmail(b, photoOf(b)),
    }, `booking-owner/${b.ref}`);
    await send({
      from: from(), to: b.customer.email, replyTo: owner(),
      subject: t('Your Kibabu Cars booking {ref} is confirmed', { ref: b.ref }),
      html: guestEmail(b, t, lang, photoOf(b)),
    }, `booking-customer/${b.ref}`);
  } catch (e) {
    console.error('[kibabu] booking email failed', (e as Error).message);
  }
}

export async function notifyMessage(msg: ContactMessage): Promise<void> {
  if (!enabled()) return;
  try {
    await send({
      from: from(), to: owner(), replyTo: msg.email,
      subject: `Website message from ${msg.name}`,
      html: messageEmail(msg),
    }, `message/${msg.id}`);
  } catch (e) {
    console.error('[kibabu] message email failed', (e as Error).message);
  }
}


/** Sends the sample confirmation to `to`, straight away. Returns the error, or null when it was accepted. */
export async function sendTestEmail(to: string): Promise<string | null> {
  if (!resendKey() && !CONFIG.smtp.host) return 'Add your Resend API key first.';
  const b = sampleBooking();
  return send({ from: from(), to, replyTo: owner(), subject: 'Test email from your Kibabu Cars website', html: guestEmail(b, undefined, 'en', photoOf(b)) },
    `test/${Date.now()}`);
}
