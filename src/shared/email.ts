import { BUSINESS, EXTRAS, LOCATIONS, whatsappLink } from './business';
import { LANG_LOCALE, Lang, Params, fill, switchPath } from './i18n';
import { Booking, ContactMessage } from './models';

/**
 * Booking emails (guest confirmation + office alert). Plain functions that return HTML,
 * shared so the server sends them and the admin can preview them.
 * Email-safe HTML: tables, inline styles, one small media query for phones.
 */
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
const TZ = 'Africa/Dar_es_Salaam';
export const day = (iso: string, locale = 'en-GB') => new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const time = (iso: string, locale = 'en-GB') => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const loc = (id: string) => LOCATIONS.find((l) => l.id === id)?.label ?? id;
/** every email goes out from info@kibabucars.com (the domain must be verified in Resend) */
export const SENDER = `${BUSINESS.name} <${BUSINESS.email}>`;
/** links and images point here (the live site); the demo preview points at itself */
let BASE = BUSINESS.siteUrl;
export function setEmailBase(url: string) { BASE = url; }
const site = (path = '') => BASE.replace(/\/$/, '') + path;
/** photo of the booked car: 'cars/x.jpg' or an uploaded image path */
export function carPhotoUrl(image?: string | null): string | null {
  if (!image) return null;
  const img = image.replace(/^\//, '');
  if (/^(https?:|data:)/.test(img)) return img.startsWith('data:') ? null : img;
  return site('/' + (img.startsWith('cars/') ? img.replace(/\.jpg$/, '-sm.jpg') : img));
}

/* ---------- design: deep sea, lagoon teal, white. Same palette as the website. ---------- */
const C = { sea: '#06323d', lagoon: '#007f86', foam: '#eef7f6', ink: '#10292f', muted: '#5b7378', line: '#dbe8e7', sun: '#ffc53d' };
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

function shell(opts: { lang?: Lang; preheader: string; body: string; footer: string }) {
  return `<!doctype html><html lang="${opts.lang ?? 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>
@media (max-width:540px){ .px{padding-left:20px!important;padding-right:20px!important} .col{display:block!important;width:100%!important} .col{padding-left:0!important;padding-right:0!important} .col + .col{padding-top:12px!important} .h1{font-size:25px!important} .btn{display:block!important;margin:0 0 10px!important;text-align:center!important} }
a{color:${C.lagoon}}
</style></head>
<body style="margin:0;padding:0;background:${C.foam};font-family:${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.foam}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 1px 0 ${C.line}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="px" style="padding:14px 32px 12px"><a href="${site()}"><img src="${site('/logo.png')}" width="120" height="60" alt="${esc(BUSINESS.name)}" style="display:block;border:0;width:120px;height:auto"></a></td></tr></table>
${opts.body}</td></tr>
<tr><td class="px" style="padding:22px 8px 0;font-size:13px;line-height:1.6;color:${C.muted}">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export type Tr = (s: string, p?: Params) => string;
const EN: Tr = (s, p) => fill(s, p);

const label = (s: string) => `<div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:${C.muted};margin:0 0 6px">${esc(s)}</div>`;
const button = (href: string, text: string, solid = true) =>
  `<a class="btn" href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;${solid ? `background:${C.sea};color:#ffffff` : `background:#ffffff;color:${C.sea};border:1.5px solid ${C.line}`}">${esc(text)}</a>`;

/** pickup and return side by side (stacked on phones) */
function trip(b: Booking, t: Tr, locale: string) {
  const cell = (title: string, place: string, iso: string, pad: string) => `<td class="col" width="50%" valign="top" style="padding:${pad}">
<div style="background:${C.foam};border-radius:16px;padding:16px 18px">${label(title)}
<div style="font-size:16px;font-weight:700;line-height:1.35;margin:0 0 4px">${esc(t(loc(place)))}</div>
<div style="font-size:14px;color:${C.muted}">${esc(day(iso, locale))} &nbsp;${esc(time(iso, locale))}</div></div></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${cell(t('Pickup'), b.pickupLocation, b.pickupAt, '0 6px 0 0')}${cell(t('Return'), b.returnLocation, b.returnAt, '0 0 0 6px')}</tr></table>`;
}

/** what they pay: each line, the total, then now / at pickup */
const payNow = (b: Booking) => b.paymentMethod === 'online';

function price(b: Booking, t: Tr) {
  const row = (k: string, v: string, strong = false) => `<tr><td style="padding:7px 0;font-size:15px;${strong ? 'font-weight:800;font-size:18px' : `color:${C.muted}`}">${esc(k)}</td><td align="right" style="padding:7px 0;font-size:15px;${strong ? 'font-weight:800;font-size:18px' : ''}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${b.quote.lines.map((l) => row(l.t ? t(l.t, l.p) : l.label, money(l.amount))).join('')}
<tr><td colspan="2" style="border-top:1px solid ${C.line};font-size:0;line-height:0;padding-top:6px">&nbsp;</td></tr>
${row(t('Total'), money(b.quote.total), true)}
</table>
<div style="margin-top:12px;border:1.5px solid ${C.lagoon};border-radius:14px;padding:12px 14px">${label(t(payNow(b) ? 'Pay now' : 'Pay at pickup'))}<div style="font-size:18px;font-weight:800;color:${C.lagoon}">${money(b.quote.total)}</div>
<div style="font-size:13px;color:${C.muted};margin-top:4px">${esc(t(payNow(b) ? 'We send you a payment link on WhatsApp right after you book.' : 'Pay the full amount in cash or by card when you get the car.'))}</div></div>`;
}

function extrasList(b: Booking, t: Tr) {
  const xs = (b.extras ?? []).filter((x) => x !== 'permit').map((x) => t(EXTRAS.find((e) => e.id === x)?.label ?? x));
  if (b.babySeats) xs.push(t('Baby seats') + ' × ' + b.babySeats);
  if (b.drivers > 1) xs.push(t('Drivers') + ': ' + b.drivers);
  if (!xs.length) return '';
  return `<div style="margin-top:18px">${label(t('Extras'))}<div style="font-size:15px;line-height:1.6">${xs.map(esc).join('<br>')}</div></div>`;
}

const section = (inner: string, top = true) => `<tr><td class="px" style="padding:24px 32px;${top ? `border-top:1px solid ${C.line}` : ''}">${inner}</td></tr>`;

function carBlock(b: Booking, t: Tr, photo: string | null) {
  return `${photo ? `<img src="${esc(photo)}" width="536" alt="${esc(b.carName)}" style="display:block;width:100%;height:auto;border-radius:16px;margin:0 0 14px;border:0">` : ''}
<div style="font-size:19px;font-weight:800;margin:0 0 2px">${esc(b.carName)}</div>
<div style="font-size:14px;color:${C.muted}">${esc(t('{n} days', { n: b.quote.days }))}</div>`;
}

/** the guest's confirmation, in the language they booked in */
export function guestEmail(b: Booking, t: Tr = EN, lang: Lang = 'en', photo: string | null = null) {
  const locale = LANG_LOCALE[lang];
  const first = b.customer.name.trim().split(/\s+/)[0];
  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="px" style="background:${C.sea};padding:30px 32px 28px;color:#ffffff">
<div style="display:inline-block;background:rgba(255,255,255,.12);color:#9fe3dc;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;margin:0 0 16px">&#10003;&nbsp; ${esc(t('Booking confirmed'))}</div>
<div class="h1" style="font-size:29px;line-height:1.15;font-weight:800;letter-spacing:-.02em;margin:0 0 14px">${esc(t('Your car is reserved, {name}.', { name: first }))}</div>
<div style="font-size:14px;color:#b8d6d8">${esc(t('Reference'))} &nbsp;<span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:.06em">${esc(b.ref)}</span></div>
</td></tr>
${section(carBlock(b, t, photo), false)}
${section(trip(b, t, locale) + extrasList(b, t))}
${section(price(b, t))}
${section(`<div style="font-size:17px;font-weight:800;margin:0 0 12px">${esc(t('Next steps'))}</div>
${[
    ...(payNow(b) ? [t('Pay {amount} with the payment link we send you on WhatsApp.', { amount: money(b.quote.total) })] : []),
    t('Send your driving licence, passport copy and a passport photo for your Zanzibar driving permit.'),
    payNow(b)
      ? t('Meet us at {place} and collect your car.', { place: t(loc(b.pickupLocation)) })
      : t('Meet us at {place}. Pay {amount} in cash or by card.', { place: t(loc(b.pickupLocation)), amount: money(b.quote.total) }),
  ].map((s, i) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>
<td valign="top" style="padding:0 12px 0 0"><div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:${C.lagoon};color:#fff;text-align:center;font-weight:800;font-size:13px">${i + 1}</div></td>
<td style="font-size:15px;line-height:1.5;padding-top:2px">${esc(s)}</td></tr></table>`).join('')}
<div style="margin-top:20px">${button(whatsappLink(`Hello Kibabu Cars, my booking is ${b.ref}.`), t('Message us on WhatsApp'))}${button(site(switchPath('/my-booking', lang)), t('Manage booking'), false)}</div>`)}
</table>`;
  const footer = `${esc(t('Questions? Reply to this email or message us on WhatsApp.'))}<br>
<strong style="color:${C.ink}">${esc(BUSINESS.name)}</strong> &nbsp;${esc(BUSINESS.phone)} &nbsp;<a href="mailto:${esc(BUSINESS.email)}">${esc(BUSINESS.email)}</a>`;
  return shell({ lang, body, footer, preheader: `${b.ref}: ${b.carName}, ${day(b.pickupAt, locale)} – ${day(b.returnAt, locale)}` });
}

/** the office alert: who booked, how to reach them, what they booked */
export function officeEmail(b: Booking, photo: string | null = null) {
  const c = b.customer;
  const wa = 'https://wa.me/' + c.phone.replace(/\D/g, '');
  const info = (k: string, v: string) => `<tr><td style="padding:5px 14px 5px 0;font-size:14px;color:${C.muted};white-space:nowrap" valign="top">${esc(k)}</td><td style="padding:5px 0;font-size:15px">${v}</td></tr>`;
  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="px" style="background:${C.sea};padding:26px 32px;color:#ffffff">
<div style="font-size:13px;font-weight:700;color:#9fe3dc;margin:0 0 8px">New booking &nbsp;${esc(b.ref)}</div>
<div class="h1" style="font-size:26px;line-height:1.2;font-weight:800;margin:0 0 6px">${esc(c.name)} booked the ${esc(b.carName)}</div>
<div style="font-size:15px;color:#b8d6d8">${esc(day(b.pickupAt))} – ${esc(day(b.returnAt))} &nbsp;(${b.quote.days} days) &nbsp;<strong style="color:#fff">${money(b.quote.total)}</strong> &nbsp;${payNow(b) ? 'pays now: send the payment link' : 'pays at pickup'}</div>
</td></tr>
${section(`${label('Customer')}<table role="presentation" cellpadding="0" cellspacing="0">
${info('Name', esc(c.name))}${info('WhatsApp', esc(c.phone))}${info('Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}${info('Country', esc(c.country))}
${b.pickupDetails ? info('Flight / hotel', esc(b.pickupDetails)) : ''}${b.passportNumber ? info('Passport', esc(b.passportNumber)) : ''}${b.notes ? info('Note', esc(b.notes)) : ''}
${info('Language', esc((b.lang || 'en').toUpperCase()))}</table>
<div style="margin-top:16px">${button(wa, 'WhatsApp ' + c.name.trim().split(/\s+/)[0])}${button('mailto:' + c.email + '?subject=' + encodeURIComponent('Your booking ' + b.ref), 'Reply by email', false)}${button(site('/admin'), 'Open admin', false)}</div>`, false)}
${section(carBlock(b, EN, photo))}
${section(trip(b, EN, 'en-GB') + extrasList(b, EN))}
${section(price(b, EN))}
</table>`;
  const footer = `Sent by the ${esc(BUSINESS.name)} website. Reply to this email to answer ${esc(c.name)} directly.`;
  return shell({ body, footer, preheader: `${b.ref}: ${c.name}, ${b.carName}, ${day(b.pickupAt)}` });
}


/** A made-up booking, for the admin's preview and test email. */
export function sampleBooking(car?: { id: string; name: string; pricePerDay: number }): Booking {
  const start = new Date(Date.now() + 14 * 864e5); start.setUTCHours(7, 30, 0, 0);
  const end = new Date(+start + 5 * 864e5);
  const rate = car?.pricePerDay ?? 35;
  const total = rate * 5 + 30;
  return {
    id: 'sample', ref: 'KB-TEST1', status: 'confirmed', carId: car?.id ?? 'rav4-5-door', carName: car?.name ?? 'Toyota RAV4 5-Door',
    pickupAt: start.toISOString(), returnAt: end.toISOString(), pickupLocation: 'airport', returnLocation: 'stone-town',
    drivers: 1, babySeats: 0, extras: ['permit', 'cooler'], needPermit: true, paymentMethod: 'arrival', lang: 'en',
    customer: { name: 'Sample Guest', email: 'guest@example.com', phone: '+255 777 000 000', country: 'Tanzania' },
    quote: { days: 5, dailyRate: rate, total, deposit: total / 2, balance: total / 2, lines: [
      { label: `5 days × $${rate}`, amount: rate * 5, t: '{n} days × {price}', p: { n: 5, price: '$' + rate } },
      { label: 'Zanzibar Driving Permit', amount: 25, t: 'Zanzibar Driving Permit' },
      { label: 'Cooler Box', amount: 5, t: 'Cooler Box' }] },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as unknown as Booking;
}

/** contact-form message, to the office */
export function messageEmail(msg: ContactMessage) {
    const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="px" style="background:${C.sea};padding:26px 32px;color:#fff">
<div style="font-size:13px;font-weight:700;color:#9fe3dc;margin:0 0 8px">Message from the website</div>
<div class="h1" style="font-size:24px;font-weight:800">${esc(msg.name)}</div>
<div style="font-size:15px;color:#b8d6d8">${esc(msg.email)}${msg.phone ? ' &nbsp;' + esc(msg.phone) : ''}</div></td></tr>
${section(`<div style="font-size:16px;line-height:1.6;white-space:pre-wrap">${esc(msg.message)}</div>
<div style="margin-top:20px">${button('mailto:' + msg.email, 'Reply by email')}${msg.phone ? button('https://wa.me/' + msg.phone.replace(/\D/g, ''), 'WhatsApp', false) : ''}</div>`, false)}
</table>`;
  return shell({ body, footer: `Sent by the ${esc(BUSINESS.name)} website contact form.`, preheader: msg.message.slice(0, 90) });
}
