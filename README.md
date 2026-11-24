# Kibabu Cars Zanzibar – Booking Website

A complete car rental booking website built with **Angular 22 + Angular Material 3**. It has server-side rendering (SSR) and prerendering for SEO, and a built-in Node/Express API.

## What's inside

| Area | Features |
|---|---|
| **Public site** (server-rendered, SEO-ready, 5 languages: EN/IT/RU/ES/DE) | Home with aerial flyover hero and scroll-driven motion, fleet with filters, a page per car, About, FAQ, Contact, Blog, Terms & privacy, 404 |
| **Booking** | Five short questions (place → dates → car → extras → details), live price and availability, pickup and return place, confirmation with reference and WhatsApp button, emails to the guest and the office |
| **My booking** | Guests look up a booking with reference + email and can cancel free before pickup |
| **Admin** `/admin` | Overview, bookings (search, filter, CSV export, status, notes), messages, cars & prices, extras, blog, FAQ, About, redirects, contact & Google settings, Email & database (Resend key, test email, preview) |
| **SEO & ads** | Title/description/canonical/hreflang per page, structured data, live `sitemap.xml`, `robots.txt`, redirects from old URLs, Search Console/Bing codes, GA4 + Google Ads conversion with cookie consent (Consent Mode v2) |
| **Data** | PostgreSQL or MySQL/MariaDB (chosen by the connection settings), JSON file for local testing, daily JSON backups |

## Project structure

```
src/
  shared/          ← used by BOTH the website and the API
    business.ts    ← ★ phone, WhatsApp, email, prices, fees, fleet, locations – edit here
    faq.ts         ← FAQ text
    pricing.ts     ← quote calculation (min 2 days, 7+ day discount, permits, delivery fees)
    models.ts      ← TypeScript types
  server/
    api.ts         ← REST API (/api/…)
    db.ts          ← JSON-file database (data/db.json)
  server.ts        ← Express server (API + Angular SSR)
  app/
    layout/        ← header, mobile menu, footer, WhatsApp button
    pages/         ← home, fleet, car-detail, book, my-booking, about, faq, contact, terms
    admin/         ← login + dashboard
    shared/        ← car card, car illustration, quick search
    core/          ← API client, fleet store, SEO service, admin auth
public/            ← favicon, icons, og-image, sitemap.xml, robots.txt, cars/ (photos)
```

## Run locally

```bash
npm install
npm run dev               # dev server at http://localhost:4200 (API included)
```

Production build:

```bash
npm run build
ADMIN_PASSWORD=choose-a-strong-one ADMIN_SECRET=$(openssl rand -hex 32) PORT=4000 npm start
```

Open http://localhost:4000. The admin dashboard is at http://localhost:4000/admin.

### Environment variables

All settings live in `.env` (copy `.env.example`). The important ones:

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | **Required in production**, 12+ characters. The server refuses to start without it |
| `ADMIN_SECRET` | **Required in production**, `openssl rand -hex 32`. Signs admin sessions and encrypts the Resend key saved in the admin. Never change it |
| `DATABASE_URL` | `postgres://…` or `mysql://…` (or the `DB_*` values). Without it: JSON file (testing only) |
| `BEHIND_CLOUDFLARE` | `true` on Cloudways Velocity or behind Cloudflare: rate limits use the visitor's real IP |
| `SITE_URL` | `https://kibabucars.com` – used in the sitemap, canonical links and emails |
| `CANONICAL_HOST` | `kibabucars.com` – other host names (www, raw IP) get a 301 to it. Leave empty while testing on a temporary domain |
| `DATA_DIR` | Folder for the safety copy and daily backups. With a database, nothing here is needed to run |
| `RESEND_API_KEY`, `OWNER_EMAIL` | Booking emails through Resend: confirmation to the customer, new-booking alert to the owner (see *Emails* below). `SMTP_*` is an optional fallback |

### Tests

```bash
npm test -- --watch=false   # pricing rules, grace period, discounts, input sanitising
```

## Languages

The site is in **English, Italiano, Русский, Español and Deutsch**. Each language has its own address
(`/`, `/it/`, `/ru/`, `/es/`, `/de/`) so Google can show tourists the page in their language; every page
lists its translations (`hreflang`) and the sitemap contains all five versions. Visitors switch with the
globe button in the menu, and stay on the same page.

- **Site texts** (menus, buttons, booking form, errors, emails): `src/shared/i18n/<lang>.ts`, English text → translation.
  After adding or changing English text in the code, run `npm run i18n`: it lists every text and reports
  anything missing or with mismatched numbers/placeholders in a language. Missing translations show in English.
- **Content** (About, FAQ, blog posts, car descriptions): edited in Admin. Each editor has an *Editing in* switch;
  pick a language to edit that version. Built-in translations are in `src/shared/i18n/content-<lang>.ts`.
- **Emails**: the customer's confirmation is sent in the language they booked in; the office copy is English.

## Database (PostgreSQL or MySQL)

Set `DATABASE_URL` (`postgres://…` or `mysql://…`) or the `DB_*` values, and everything is stored in the database:

| Table | What |
|---|---|
| `kb_bookings` | one row per booking (ref, status, car, dates, customer, total + full details) |
| `kb_messages` | contact form messages |
| `kb_cars` | cars and prices, in display order |
| `kb_content` | business details, About, FAQ, blog, extras, redirects, translations, admin settings (Resend key encrypted) |
| `kb_uploads` | photos uploaded in the admin |

- **Tables are created automatically** on first start. Nothing to import by hand.
- **Moving from the JSON file:** if the database is empty, the existing `data/db.json` and `data/uploads/` are imported on first start.
- **Nothing important lives on the server's disk**, so redeploys on platforms like Cloudways Velocity lose nothing.
- **Speed:** the site reads from a copy in memory, and only changed rows are written.
- **Safety:** every change is also written to `data/db.json`, and a JSON export is kept daily in `data/backups/`. If the database is briefly unreachable, new bookings are still accepted and saved automatically when it is back (retried every 10 seconds). If it is unreachable at start-up, visitors see a short "updating" page and the site recovers by itself.
- **Health check:** `GET /api/health` returns `{"ok":true,"storage":"postgres"}` (or `mysql`), or HTTP 503 while saves are failing. Point an uptime monitor at it.
- Run **one** copy of the app per database (no load balancing across several servers).

Without database settings the app uses `data/db.json` only (local development).

## Emails (Resend)

Every booking sends two emails: a confirmation to the customer (car, dates, every extra, price breakdown, 50/50 split, next steps)
and an alert to `OWNER_EMAIL` with the customer's details. Contact-form messages go to the owner too.

1. Create a free account at resend.com.
2. **Domains → Add domain** → `kibabucars.com`. Add the DNS records it shows (SPF/DKIM, plus DMARC) at your DNS provider. Wait for *Verified*.
3. **API Keys → Create** with *Sending access*. Paste it in the admin under **Email & database** (stored encrypted with `ADMIN_SECRET`, never shown again), or put it in `RESEND_API_KEY`. A key saved in the admin wins.
   If you ever change `ADMIN_SECRET`, paste the key in the admin again.
4. Emails are sent from `Kibabu Cars <info@kibabucars.com>`. Set `OWNER_EMAIL` if alerts should go somewhere else.
5. In the admin, **Email & database → Send a test email**, then make a test booking and check both inboxes (and *Emails* in the Resend dashboard).

The database connection is deliberately **not** editable in the admin: it stays in `.env`, so a stolen admin password can't point the site at someone else's database.

Emails never block a booking: if Resend is down the booking is still saved and the error is logged. Retries use an
idempotency key, so nobody gets the same email twice.

## Going to production

### Cloudways Velocity (managed Node.js) – recommended

1. Push the project to a **private GitHub repository** (`.env` and `data/` are ignored by git).
2. Cloudways → **Velocity → Applications → Add**. Plan Starter is enough. Region: one near Europe/Africa (e.g. Frankfurt).
3. **Connect GitHub**, pick the repository, branch `main`, Node **22 LTS**, root directory `/`.
4. Build settings: build command `npm run build`, start command `npm start` (the app listens on the `PORT` the platform gives it).
5. **Database → PostgreSQL → Install.** Cloudways adds the connection variables itself. If they are not `DATABASE_URL` / `DB_*` / `PG*`, add `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME` from the credentials it shows.
6. **Environment variables** (mark the secrets *Sensitive*): `NODE_ENV=production`, `SITE_URL=https://kibabucars.com`, `BEHIND_CLOUDFLARE=true`, `ADMIN_PASSWORD`, `ADMIN_SECRET` (`openssl rand -hex 32`), `OWNER_EMAIL`, and `ALLOWED_HOSTS=` the temporary domain Cloudways gives you (without https://). Leave `CANONICAL_HOST` empty for now.
7. **Deploy.** Open the temporary domain: the site, `/api/health` (should say `postgres`) and `/admin`. The temporary domain is automatically hidden from Google.
8. Admin → **Email & database**: paste the Resend key, send a test email. Make a test booking, check both inboxes, then cancel it.
9. **Domain:** Velocity → Domains → *Add custom domain* `kibabucars.com` (+ `www`). Change the DNS records as it shows. When it is live, set `CANONICAL_HOST=kibabucars.com` and redeploy.
10. Search Console: submit `https://kibabucars.com/sitemap.xml` (see *SEO* below).

### Option B – Docker + Caddy on any VPS (HTTPS automatic)

On a small VPS (Hetzner, DigitalOcean, Contabo; 1 GB RAM is enough) with Docker installed:

```bash
git clone <repo> kibabu && cd kibabu
cp .env.example .env && nano .env      # set ADMIN_PASSWORD, ADMIN_SECRET, DATABASE_URL
docker compose up -d --build
```

Point the DNS `A` records for `kibabucars.com` and `www.kibabucars.com` to the server IP. Caddy gets the
certificate by itself, redirects `www` → `kibabucars.com` and HTTP → HTTPS.

### Option C – PM2 behind Nginx/Caddy

```bash
npm ci && npm run build
cp .env.example .env && nano .env
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

### What is already handled

- **Security headers** (helmet): Content-Security-Policy, HSTS (2 years), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- **Abuse protection**: per-IP rate limits (300 req/min overall; tighter on booking, contact, lookup and admin login), hidden spam-trap fields on the booking and contact forms, body size limits, double-booking re-check when saving.
- **Admin**: constant-time password check, signed expiring session token, rate-limited login, all content sanitised on the server (no script or `javascript:` links can be saved).
- **Uploads**: only real JPEG/PNG/WebP files (checked by file signature, max 8 MB), random file names.
- **Scanners**: `/wp-admin`, `/wp-login.php`, `.php`, `.env`, `.git` probes get a cheap 404 without rendering a page.
- **Errors**: never show stack traces; logged on the server.
- **Data**: atomic writes, daily backup of `db.json` in `DATA_DIR/backups` (14 days kept). Also copy `DATA_DIR` off the server weekly.
- **Startup checks**: refuses to start in production with a weak or missing admin password/secret; graceful shutdown on deploys.
- **Caching**: hashed JS/CSS cached 1 year, pages `no-cache`, API `no-store`, gzip/brotli compression.

### Extra protection (recommended, free)

Put the domain on **Cloudflare** (free plan): DNS proxied (orange cloud), SSL mode **Full (strict)**, turn on
*Bot Fight Mode*. It absorbs DDoS attacks before they reach the server. If you do, keep Caddy as is.

## SEO – making people find the site

Built in:

- Every page is **server-rendered** (Google sees full HTML, not an empty app) with its own title, description, canonical link, Open Graph and Twitter cards.
- **Structured data**: `AutoRental` business (address, phone, opening hours, map location), `WebSite`, `Product` + `Offer` for each car, `BlogPosting` for posts, `FAQPage`, `BreadcrumbList`.
- `/sitemap.xml` is generated live (new cars and posts appear automatically, with `lastmod`). `/robots.txt` points to it and hides admin/booking pages.
- **301 redirects from every old WordPress URL** (`/rental-list/`, `/rental/<car>/`, `/about-us/`, `/contact-us/`, `/reviews/`…) and trailing slashes, so existing Google rankings move to the new pages.
- Real 404 status for missing pages, `noindex` on admin/booking pages.
- Fast: self-hosted fonts, responsive car images, lazy loading, compressed responses.
- Admin → Contact & social → *Search engines and analytics*: paste the Google/Bing verification codes and the GA4 id; no code changes.

Launch checklist (owner, once):

1. Deploy on **kibabucars.com** (same domain, so rankings carry over).
2. **Google Search Console**: add the domain, paste the verification code in Admin, submit `https://kibabucars.com/sitemap.xml`, then use *URL inspection → Request indexing* on the home page and /fleet.
3. **Bing Webmaster Tools**: import from Search Console (one click). This also covers DuckDuckGo and Yahoo.
4. **Google Business Profile** "Kibabu Cars Zanzibar": category *Car rental agency*, same phone, website link, opening hours 24/7, 10+ real photos. For "car rental Zanzibar" this matters as much as the website.
5. **Reviews**: after each rental send the Google review link on WhatsApp. Reviews are the biggest local ranking factor.
6. **Listings** with the same name/phone/website: Tripadvisor, Facebook page, Instagram bio, TikTok bio, Zanzibar tourism directories, hotel partners' "useful contacts" pages. Each one is a link Google trusts.
7. **Write a post a month** in Admin → Blog (e.g. "Driving from Stone Town to Nungwi", "Jozani forest by car"). Each one targets searches tourists make.
8. Check Search Console monthly: *Pages* (errors), *Performance* (which searches bring visitors).

## Booking rules (same as the WordPress site)

All in `src/shared/business.ts` (`RULES`) and `src/shared/pricing.ts`, shared by the website and the API:

- Nissan Juke is always listed first; the rest are sorted by price.
- 7+ days: $5/day off, every car except the Juke.
- Days are 24-hour blocks from pickup. Extra 1–5 hours = free (grace period, not for the Juke); 6+ hours = one more day.
- Coastal area: $20 pickup + $20 drop-off. Airport and Stone Town free.
- Zanzibar driving permit: $25 per driver, always included, can't be removed.
- Airport pickup or drop-off: flight number and passport number are required.
- Bookings are confirmed automatically when the car is free for the dates (no admin approval). If all units of that car are booked, the customer is told straight away and can pick another car.
- Payment: 50% deposit online, 50% cash or card on delivery. Until an online payment gateway is connected, the team sends the customer a payment link when confirming.
- Day-based rentals only, minimum 2 days.
- No "similar cars" section on car pages.

## Admin: managing content (no code needed)

Log in at `/admin`. Besides bookings, the dashboard has:

| Tab | What you can do |
|---|---|
| **Cars** | Add, edit or delete cars with photo, price, units, seats, doors, luggage, gearbox, fuel, 4x4, description, features; take a car offline; show it on the home page; pin it first; exclude it from discounts |
| **Blog** | Write, edit and delete posts with a cover photo. Simple formatting: empty line = new paragraph, `## ` heading, `- ` list item, `> ` tip box |
| **FAQ** | Add, edit, reorder and delete topics and questions |
| **About page** | Edit the title, story and values |
| **Contact & social** | Phone, WhatsApp number, email, address, Facebook, Instagram, TikTok, Tripadvisor link, and the numbers shown on the site |

Everything is saved in `data/db.json`, and photos go in `data/uploads/` (resized in the browser before upload). **Back up the `data` folder.**

Pages are rendered on the server from the live data on every request, so changes show up straight away and Google sees them. `/sitemap.xml` is generated automatically and includes new cars and blog posts. Cars that have upcoming bookings can't be deleted, but you can take them offline instead.

Default texts (used for a fresh install) are in `src/shared/` (`blog.ts`, `faq.ts`, `about.ts`, `business.ts`).

## Before going live – please check with the owner ✅

- **Photos:** each car uses its real fleet photo from `public/cars/`. Scene photos (ocean, Stone Town, beach) are free Unsplash photos loaded from unsplash.com; if one can't load, a local fleet photo from `public/photos/` is shown instead. Check with the owner that `rav4-new-shape.jpg` (from the file *vanguard-newshape*) really shows the new-shape RAV4.
- **Seats / bags / units per model:** these are typical values and need confirming. Change them in `src/shared/business.ts` or in the admin panel (units).
- **Coastal delivery fee:** set to $20 each way (delivery and collection). Change it in `LOCATIONS` if it should be charged only once.
- **Additional driver fee:** the old site charges per additional driver, but the amount isn't in the snippets. It is currently $0 (`RULES.extraDriverFee`).
- **Optional insurance upgrades (CDW, theft waiver, full insurance):** the old site offered these as optional extras. Prices weren't in the snippets, so they're not on the new site yet.
- **Social links:** the Instagram and TikTok URLs in `BUSINESS` are placeholders.
- **Reviews:** the home page uses short lines from the old site's reviews page. Replace them with full reviews (with names, if customers agree).
- **Privacy text** in `/terms#privacy` (incl. cookies) is a plain-language draft. Have the owner review it.

## Next steps (phase 2)

- **Online payment:** the "Pay online" option is shown as *Coming soon*. Integrate a Tanzanian gateway (Selcom, AzamPay, ClickPesa or Pesapal) for M-Pesa, Airtel Money and cards in `src/server/api.ts`. You need a merchant account and API keys first.
- **WhatsApp notifications** to the office for each booking (WhatsApp Cloud API), next to the email in `src/server/mail.ts`.

## Phone demo (no server)

`npx ng build --configuration demo` makes a static version in `dist/demo/browser` with the API running inside the browser (`src/app/core/demo-api.ts`). Bookings are kept on that device only. Admin password in the demo: `kibabu-admin`. Use this only for showing the client. The real site uses `npm run build`.
