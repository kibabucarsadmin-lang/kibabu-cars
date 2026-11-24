import { randomBytes } from 'node:crypto';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { createApiRouter } from './server/api';
import { CONFIG, IS_PROD, checkConfig } from './server/config';
import { UPLOADS_DIR, db, startBackups } from './server/db';
import { SEED_CARS } from './shared/business';
import { LANGS, Lang, switchPath } from './shared/i18n';
import { Redirect } from './shared/content';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
// Host names the pages may be served on: the real domain (from SITE_URL), its www twin, and extra ones
// such as the hosting's temporary test domain (ALLOWED_HOSTS=kibabu-abc.cloudwaysapps.com, comma separated).
const SITE_HOSTNAME = new URL(CONFIG.siteUrl).hostname;
const angularApp = new AngularNodeAppEngine({
  allowedHosts: [SITE_HOSTNAME, 'www.' + SITE_HOSTNAME.replace(/^www\./, ''), ...CONFIG.allowedHosts],
  // the hosting proxy says whether the visitor used https; the host name itself is never taken from a header
  trustProxyHeaders: ['x-forwarded-proto', 'x-forwarded-for'],
});

app.set('trust proxy', CONFIG.trustProxy);

// Load the data (MySQL or file) before answering the first request.
app.use((_req, res, next) => {
  db.init().then(
    () => next(),
    () => res.status(503).type('text/html').send('<!doctype html><title>Kibabu Cars</title><p style="font-family:sans-serif">We are updating the website. Please try again in a minute, or WhatsApp us.</p>'),
  );
});
app.disable('x-powered-by');

/* ---------- Canonical host + HTTPS (one address for Google) ---------- */
app.use((req, res, next) => {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const wrongHost = CONFIG.canonicalHost && req.hostname !== CONFIG.canonicalHost && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1';
  if (wrongHost || (CONFIG.forceHttps && proto !== 'https')) {
    res.redirect(301, `https://${CONFIG.canonicalHost || req.hostname}${req.originalUrl}`);
    return;
  }
  next();
});

/* ---------- Security headers ---------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        // Google Analytics / Ads: only loaded after the visitor accepts cookies
        'script-src': ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://unsplash.com', 'https://images.unsplash.com', 'https://*.google-analytics.com', 'https://*.googletagmanager.com', 'https://www.googleadservices.com', 'https://*.doubleclick.net', 'https://www.google.com', 'https://*.google.com'],
        'font-src': ["'self'", 'data:'],
        'media-src': ["'self'", 'https:'],
        'connect-src': ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com', 'https://www.googleadservices.com', 'https://*.doubleclick.net', 'https://www.google.com', 'https://*.google.com'],
        'frame-src': ['https://maps.google.com', 'https://www.google.com', 'https://td.doubleclick.net', 'https://www.googletagmanager.com'],
        'frame-ancestors': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        ...(IS_PROD ? { 'upgrade-insecure-requests': [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: IS_PROD ? { maxAge: 63072000, includeSubDomains: true, preload: false } : false,
  }),
);
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  next();
});

app.use(compression());

/* ---------- Keep test addresses out of Google ---------- */
// Only the real domain (SITE_URL) may be indexed; a hosting test domain or the server IP never is.
const indexable = (host: string) => host === SITE_HOSTNAME || host === 'localhost' || host === '127.0.0.1';
app.use((req, res, next) => {
  if (!indexable(req.hostname)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

/* ---------- Keep private pages out of search results ---------- */
app.use(['/admin', '/api', '/book', '/my-booking', ...['it', 'ru', 'es', 'de'].flatMap((l) => [`/${l}/admin`, `/${l}/book`, `/${l}/my-booking`])], (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

/* ---------- Cheap 404 for bot scans of WordPress/PHP paths ---------- */
app.use((req, res, next) => {
  if (/^\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc)|\.(php|asp|aspx|env|git|sql|bak)(\/|$)/i.test(req.path)) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  next();
});

/* ---------- 301 redirects: old links → pages (Admin → Redirects; keeps Google rankings) ---------- */
const carIds = new Set(SEED_CARS.map((c) => c.id));
let redirectSrc: Redirect[] | undefined;
let redirectMap = new Map<string, string>();
function redirectFor(path: string): string | null {
  const list = db.read().content.redirects ?? [];
  if (list !== redirectSrc) { // rebuild only after an admin save
    redirectSrc = list;
    redirectMap = new Map(list.map((r) => [r.from.toLowerCase(), r.to]));
  }
  let p = path;
  try { p = decodeURI(path); } catch { /* keep */ }
  return redirectMap.get(p.toLowerCase()) ?? null;
}
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const path = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const qs = req.originalUrl.slice(req.path.length);
  (req as Request & { kbPath?: string }).kbPath = path; // for the "links that found nothing" list
  let target = redirectFor(path);
  const legacyCar = !target && /^\/rental\/([a-z0-9-]+)$/.exec(path);
  if (legacyCar) {
    const id = legacyCar[1].replace(/-\d+$/, '');
    target = carIds.has(id) || db.read().cars.some((c) => c.id === id) ? `/fleet/${id}` : '/fleet';
  }
  if (target) { res.redirect(301, /^https:/i.test(target) || target === '/fleet' ? target : target + qs); return; }
  if (path !== req.path && !req.path.startsWith('/api')) { res.redirect(301, path + qs); return; } // trailing slash
  next();
});

/* Remember pages that were not found, so the admin can redirect them. Saved once a minute. */
const missingHits = new Map<string, number>();
function noteMissing(path: string | undefined) {
  if (!path || path.length > 200 || /\.[a-z0-9]{2,5}$/i.test(path) || missingHits.size > 500) return;
  missingHits.set(path, (missingHits.get(path) ?? 0) + 1);
}
setInterval(() => {
  if (!missingHits.size) return;
  const now = new Date().toISOString();
  db.write((d) => {
    const list = d.missing ?? [];
    for (const [path, hits] of missingHits) {
      const m = list.find((x) => x.path === path);
      if (m) { m.hits += hits; m.last = now; } else list.push({ path, hits, last: now });
    }
    d.missing = list.sort((x, y) => y.hits - x.hits).slice(0, 100);
  });
  missingHits.clear();
}, 60_000).unref();

/* ---------- API ---------- */
app.use('/api', createApiRouter());

/* ---------- Sitemap from the live database ---------- */
app.get('/sitemap.xml', (_req, res) => {
  const { cars, content } = db.read();
  const base = CONFIG.siteUrl;
  const today = new Date().toISOString().slice(0, 10);
  const pages: [string, string, string, string][] = [
    ['/', 'weekly', '1.0', today], ['/fleet', 'weekly', '0.9', today], ['/blog', 'weekly', '0.7', content.blog[0]?.date ?? today],
    ['/faq', 'monthly', '0.6', today], ['/about', 'monthly', '0.5', today], ['/contact', 'monthly', '0.5', today], ['/terms', 'yearly', '0.3', today],
    ...cars.filter((c) => c.active).map((c) => [`/fleet/${c.id}`, 'monthly', '0.8', today] as [string, string, string, string]),
    ...content.blog.map((p) => [`/blog/${p.slug}`, 'monthly', '0.6', p.date] as [string, string, string, string]),
  ];
  // every page in every language, each listing its translations (hreflang) so Google shows the right one
  const href = (lang: Lang, path: string) => base + switchPath(path, lang).replace(/^\/$/, '/');
  const urls = pages.flatMap(([path, freq, prio, date]) =>
    LANGS.map((lang) => {
      const alts = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${href(l, path)}"/>`).join('') +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${href('en', path)}"/>`;
      return `  <url><loc>${href(lang, path)}</loc><lastmod>${date}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority>${alts}</url>`;
    }),
  );
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      urls.join('\n') + `\n</urlset>\n`,
  );
});

app.get('/robots.txt', (req, res) => {
  if (!indexable(req.hostname)) { res.type('text/plain').send('User-agent: *\nDisallow: /\n'); return; }
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n` +
      ['', '/it', '/ru', '/es', '/de'].map((p) => `Disallow: ${p}/admin\nDisallow: ${p}/book\nDisallow: ${p}/my-booking\n`).join('') +
      `\nSitemap: ${CONFIG.siteUrl}/sitemap.xml\n`,
  );
});

/* ---------- Files ---------- */
// Uploaded photos: from MySQL when it is used, otherwise from data/uploads
app.get('/uploads/:name', async (req, res, next) => {
  const name = String(req.params['name']);
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(name)) { res.status(404).end(); return; }
  try {
    const file = await db.getUpload(name);
    if (!file) return next();
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.type(file.mime).send(file.data);
  } catch (e) {
    next(e);
  }
});
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', index: false, fallthrough: false }));
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      // build files have a content hash in the name → cache forever; others for a week
      const hashed = /-[A-Z0-9]{8}\.(js|css)$|\/media\//.test(path);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=604800');
    },
  }),
);

/* ---------- Languages: /it/…, /ru/…, /es/…, /de/… ---------- */
// The prefix is removed before rendering and passed on as x-kb-lang; the app then sets its
// base href to /it/ so every link on the page stays in that language.
app.use((req, _res, next) => {
  delete req.headers['x-kb-lang']; // never trust a visitor-sent value
  const m = /^\/(it|ru|es|de)(?=\/|\?|$)/.exec(req.url);
  if (m) {
    req.headers['x-kb-lang'] = m[1];
    let rest = req.url.slice(m[0].length);
    if (!rest.startsWith('/')) rest = '/' + rest;
    req.url = rest;
    req.originalUrl = rest;
  }
  next();
});

/* ---------- Server-side rendered pages ---------- */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) return next();
      if (response.status === 404) noteMissing((req as Request & { kbPath?: string }).kbPath);
      res.setHeader('Cache-Control', 'no-cache');
      if (!(response.headers.get('content-type') ?? '').includes('text/html')) return writeResponseToNodeResponse(response, res);
      return withNonce(response, res);
    })
    .catch(next);
});

/**
 * Script protection: every page gets a fresh random nonce. Only <script> tags written by the app carry it,
 * and the Content-Security-Policy allows only scripts with that nonce (no 'unsafe-inline'). Text a visitor or
 * admin typed is always escaped by Angular, so it can never become a script tag with the nonce.
 */
async function withNonce(response: globalThis.Response, res: Response) {
  const nonce = randomBytes(16).toString('base64');
  const html = (await response.text()).replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`);
  const csp = String(res.getHeader('Content-Security-Policy') ?? '').replace("'unsafe-inline' https://www.googletagmanager.com", `'nonce-${nonce}' https://www.googletagmanager.com`);
  res.status(response.status);
  response.headers.forEach((v, k) => {
    if (!['content-length', 'content-encoding', 'transfer-encoding'].includes(k)) res.setHeader(k, v);
  });
  if (csp) res.setHeader('Content-Security-Policy', csp);
  res.type('html').send(html);
}

/* ---------- Errors: log, never leak details ---------- */
app.use((err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => {
  // expected refusals (not found, forbidden path, bad JSON, too large…) keep their own code and are not logged as crashes
  const status = (err as { status?: number; statusCode?: number }).status ?? (err as { statusCode?: number }).statusCode;
  if (status && status >= 400 && status < 500) { res.status(status).type('text/plain').send(status === 404 ? 'Not found' : 'Bad request'); return; }
  console.error('[kibabu] error on', req.method, req.originalUrl, err);
  res.status(500).type('text/html').send('<!doctype html><title>Kibabu Cars</title><p style="font-family:sans-serif">Sorry, something went wrong. Please try again, or WhatsApp us.</p>');
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  checkConfig();
  startBackups(CONFIG.backupDays);
  process.on('unhandledRejection', (e) => console.error('[kibabu] unhandled rejection', e));
  const server = app.listen(CONFIG.port, (error) => {
    if (error) throw error;
    console.log(`[kibabu] listening on http://localhost:${CONFIG.port} (${IS_PROD ? 'production' : 'development'})`);
  });
  const stop = (sig: string) => {
    console.log(`[kibabu] ${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

export const reqHandler = createNodeRequestHandler(app);
