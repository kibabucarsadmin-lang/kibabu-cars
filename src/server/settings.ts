import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { CONFIG } from './config';
import { db } from './db';

/**
 * Settings the admin can change from the dashboard (stored with the other data, MySQL or db.json).
 * Secrets are encrypted (AES-256-GCM) with a key derived from ADMIN_SECRET, are never sent back
 * to the browser, and only their last 4 characters are shown.
 * The database connection is NOT here on purpose: it stays in the server's environment (.env).
 */
export interface StoredSettings {
  /** encrypted Resend API key: "v1.iv.tag.data" (base64url) */
  resendKey?: string;
  resendKeyHint?: string;
  /** where new-booking alerts go (blank = OWNER_EMAIL or info@kibabucars.com) */
  ownerEmail?: string;
  updatedAt?: string;
}

function key(): Buffer {
  const secret = CONFIG.adminSecret || CONFIG.adminPassword || 'kibabu-dev-only';
  return createHash('sha256').update('kibabu-settings-v1:' + secret).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

/** null when it can't be read (e.g. ADMIN_SECRET changed) */
export function unseal(sealed: string | undefined): string | null {
  if (!sealed) return null;
  try {
    const [v, iv, tag, data] = sealed.split('.');
    if (v !== 'v1') return null;
    const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

const stored = (): StoredSettings => {
  try {
    return db.read().settings ?? {};
  } catch {
    return {};
  }
};

/** The Resend key to use: the one saved in the admin, else RESEND_API_KEY from the environment. */
export function resendKey(): string {
  return unseal(stored().resendKey) || CONFIG.resendKey;
}

/** Where new-booking alerts go. */
export function ownerEmail(fallback: string): string {
  return stored().ownerEmail || CONFIG.ownerEmail || fallback;
}

export const RESEND_KEY_RE = /^re_[A-Za-z0-9_-]{10,200}$/;

/** What the admin page may see (never the key itself). */
export function publicSettings() {
  const s = stored();
  const saved = !!s.resendKey;
  const readable = saved && unseal(s.resendKey) !== null;
  return {
    email: {
      source: readable ? 'admin' : CONFIG.resendKey ? 'env' : 'none',
      hint: readable ? s.resendKeyHint ?? '' : CONFIG.resendKey ? '••••' + CONFIG.resendKey.slice(-4) : '',
      unreadable: saved && !readable,
      ownerEmail: s.ownerEmail ?? '',
      ownerDefault: CONFIG.ownerEmail || '',
      updatedAt: s.updatedAt ?? null,
    },
    database: db.status(),
  };
}
