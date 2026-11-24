/**
 * Runtime configuration from environment variables (see .env.example).
 * In production the server refuses to start with unsafe settings.
 */
const env = process.env;
export const IS_PROD = env['NODE_ENV'] === 'production';

export const CONFIG = {
  port: Number(env['PORT'] || 4000),
  /** proxies in front of the app (load balancer, CDN): how many to trust for the visitor's IP. Default 1. */
  trustProxy: Number(env['TRUST_PROXY'] || 1),
  /** behind Cloudflare: take the visitor's IP from CF-Connecting-IP (rate limits per real visitor) */
  cloudflare: env['BEHIND_CLOUDFLARE'] === 'true',
  siteUrl: (env['SITE_URL'] || 'https://kibabucars.com').replace(/\/$/, ''),
  /** e.g. kibabucars.com – requests for other hosts (www., IP) are 301-redirected here */
  canonicalHost: env['CANONICAL_HOST'] || '',
  /** extra host names pages may be served on, e.g. the hosting's temporary domain (comma separated) */
  allowedHosts: (env['ALLOWED_HOSTS'] || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
  forceHttps: env['FORCE_HTTPS'] === 'true',
  adminPassword: env['ADMIN_PASSWORD'] || '',
  adminSecret: env['ADMIN_SECRET'] || '',
  /** Resend API key (re_...). Preferred way to send email. */
  resendKey: env['RESEND_API_KEY'] || '',
  smtp: {
    host: env['SMTP_HOST'] || '',
    port: Number(env['SMTP_PORT'] || 587),
    secure: env['SMTP_SECURE'] === 'true',
    user: env['SMTP_USER'] || '',
    pass: env['SMTP_PASS'] || '',
    from: env['MAIL_FROM'] || '',
  },
  /** where new-booking notifications go (defaults to the email in Admin → Settings) */
  ownerEmail: env['OWNER_EMAIL'] || '',
  backupDays: Number(env['BACKUP_KEEP_DAYS'] || 14),
  /**
   * Database: MySQL/MariaDB or PostgreSQL. Empty = JSON file.
   * DATABASE_URL=mysql://… or postgres://…, or the DB_* values (DB_CLIENT=postgres or port 5432 picks PostgreSQL),
   * or PostgreSQL's own PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
   */
  database: databaseConfig(),
};

function databaseConfig() {
  const url = env['DATABASE_URL'] || env['POSTGRES_URL'] || '';
  const host = env['DB_HOST'] || env['PGHOST'] || '';
  if (!url && !host) return null;
  const forced = (env['DB_CLIENT'] || '').toLowerCase();
  const client: 'mysql' | 'postgres' =
    forced.startsWith('p') ? 'postgres' : forced.startsWith('m') ? 'mysql'
      : /^postgres(ql)?:/.test(url) ? 'postgres' : /^mysql:/.test(url) ? 'mysql'
        : env['PGHOST'] || env['DB_PORT'] === '5432' ? 'postgres' : 'mysql';
  return {
    client,
    url,
    host: host || '127.0.0.1',
    port: Number(env['DB_PORT'] || env['PGPORT'] || (client === 'postgres' ? 5432 : 3306)),
    user: env['DB_USER'] || env['PGUSER'] || '',
    password: env['DB_PASSWORD'] || env['PGPASSWORD'] || '',
    database: env['DB_NAME'] || env['PGDATABASE'] || '',
    /** PostgreSQL over TLS: DB_SSL=true (needed by most hosted databases), DB_SSL=false to turn off */
    ssl: env['DB_SSL'] ? env['DB_SSL'] === 'true' : /sslmode=require/.test(url),
  };
}

export function checkConfig(): void {
  const problems: string[] = [];
  if (IS_PROD) {
    if (CONFIG.adminPassword.length < 12) problems.push('ADMIN_PASSWORD must be set and at least 12 characters.');
    if (CONFIG.adminSecret.length < 32) problems.push('ADMIN_SECRET must be set to a random string of at least 32 characters (openssl rand -hex 32).');
    if (!/^https:\/\//.test(CONFIG.siteUrl)) problems.push('SITE_URL must start with https://');
    const m = CONFIG.database;
    if (m && !m.url && (!m.user || !m.database)) problems.push('DB_USER and DB_NAME must be set (with DB_HOST and DB_PASSWORD) to use the database.');
  }
  if (problems.length) {
    console.error('\n[kibabu] Cannot start in production:\n  - ' + problems.join('\n  - ') + '\n');
    process.exit(1);
  }
  if (!CONFIG.database) console.warn('[kibabu] DATABASE_URL / DB_HOST not set – data is stored in data/db.json instead of a database.');
  if (!CONFIG.adminPassword) console.warn('[kibabu] ADMIN_PASSWORD not set – using the development password "kibabu-admin".');
  if (!CONFIG.resendKey && !CONFIG.smtp.host) console.warn('[kibabu] RESEND_API_KEY not set – booking emails are disabled.');
  if (CONFIG.resendKey && !/^re_/.test(CONFIG.resendKey)) console.warn('[kibabu] RESEND_API_KEY looks wrong (it should start with re_).');
}
