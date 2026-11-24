import type { StoredSettings } from './settings';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { accessSync, constants as FS } from 'node:fs';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DEFAULT_ADDONS, SEED_CARS, applyAddons } from '../shared/business';
import { DEFAULT_REDIRECTS, MissingLink, SiteContent, defaultContent } from '../shared/content';
import { Booking, Car, ContactMessage } from '../shared/models';
import { CONFIG } from './config';
import { PAYMENT_FAQ_UPDATE } from './faq-migration';

/**
 * Storage.
 *
 * - With database settings (DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) everything is stored in
 *   MySQL / MariaDB or PostgreSQL tables: bookings, messages, cars, site content and uploaded photos.
 * - Without them it falls back to one JSON file (data/db.json), handy for local development.
 *
 * Reads come from an in-memory copy, so pages stay fast. Every change is saved to the database straight away
 * (only the rows that changed) and also mirrored to data/db.json as a local safety copy.
 * On first start with an empty database, the existing db.json is imported automatically.
 */
export interface DbShape {
  cars: Car[];
  bookings: Booking[];
  messages: ContactMessage[];
  content: SiteContent;
  /** Links visitors opened that found no page (most-hit first, max 100). */
  missing?: MissingLink[];
  /** Admin settings (Resend key encrypted). Never sent to visitors. */
  settings?: StoredSettings;
}

/**
 * Folder for the safety copy and daily backups. The first writable one of: DATA_DIR, ./data,
 * the project folder (next to dist/), the system temp folder. Hosting platforms often start the
 * app from a read-only folder, so it never relies on the start folder alone.
 */
function pickDataDir(): string {
  const here = (() => { try { return dirname(fileURLToPath(import.meta.url)); } catch { return process.cwd(); } })();
  const candidates = [process.env['DATA_DIR'], join(process.cwd(), 'data'), resolve(here, '../../../data'), join(tmpdir(), 'kibabu-data')];
  for (const c of candidates) {
    if (!c) continue;
    try {
      mkdirSync(c, { recursive: true });
      accessSync(c, FS.W_OK);
      return resolve(c);
    } catch { /* not writable, try the next one */ }
  }
  return join(tmpdir(), 'kibabu-data');
}
const DATA_DIR = pickDataDir();
console.log("[kibabu] data folder:", DATA_DIR);
const DB_FILE = join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const CONTENT_KEYS = ['business', 'about', 'faq', 'blog', 'addons', 'redirects', 'i18n'] as const;

// Shared through globalThis so the API and the server-rendered app always use the same copy.
const G = globalThis as unknown as { __kbDb?: DbShape | null; __kbSql?: Sql | null };

/* ------------------------------------------------------------------ data upgrades */

function upgrade(cache: DbShape): DbShape {
  // cars the admin deleted are not re-added
  for (const seed of SEED_CARS) {
    const car = cache.cars.find((c) => c.id === seed.id);
    if (car) {
      if (!car.image || car.image.includes('wikimedia')) car.image = seed.image;
      car.noDiscount ??= seed.noDiscount;
      car.pinned ??= seed.pinned;
    }
  }
  cache.bookings ??= [];
  cache.messages ??= [];
  if (!cache.content) cache.content = defaultContent();
  const def = defaultContent();
  cache.content.business ??= def.business;
  cache.content.about ??= def.about;
  cache.content.faq ??= def.faq;
  cache.content.blog ??= def.blog;
  cache.content.redirects ??= structuredClone(DEFAULT_REDIRECTS);
  cache.content.addons ??= structuredClone(DEFAULT_ADDONS);
  // insurance is described as basic, not comprehensive (FAQ text saved before that change)
  const basic: [string, string][] = [['Comprehensive insurance (', 'Basic insurance ('], ['Assicurazione completa (', 'Assicurazione base ('],
    ['Vollkaskoversicherung (', 'Basisversicherung ('], ['Seguro a todo riesgo (', 'Seguro básico ('], ['Полная страховка (', 'Базовая страховка (']];
  const fixFaq = (groups?: { items: { a: string }[] }[]) => groups?.forEach((g) => g.items.forEach((it) => { for (const [a, b] of basic) it.a = it.a.split(a).join(b); }));
  fixFaq(cache.content.faq);
  for (const t of Object.values(cache.content.i18n ?? {})) fixFaq((t as { faq?: { items: { a: string }[] }[] }).faq);
  // payment is now "pay now or at pickup" (no 50/50 split): update the default answers nobody has edited
  const payFaq = (groups?: { items: { a: string }[] }[]) => groups?.forEach((g) => g.items.forEach((it) => { it.a = PAYMENT_FAQ_UPDATE[it.a] ?? it.a; }));
  payFaq(cache.content.faq);
  for (const t of Object.values(cache.content.i18n ?? {})) payFaq((t as { faq?: { items: { a: string }[] }[] }).faq);
  // add built-in translations for languages that have none yet (admin edits are kept)
  cache.content.i18n ??= {};
  for (const [lang, t] of Object.entries(def.i18n ?? {})) (cache.content.i18n as Record<string, unknown>)[lang] ??= t;
  return cache;
}

function fresh(): DbShape {
  return { cars: structuredClone(SEED_CARS), bookings: [], messages: [], content: defaultContent() };
}

function readFile(): DbShape | null {
  if (!existsSync(DB_FILE)) return null;
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf8')) as DbShape;
  } catch (e) {
    console.error('[kibabu] could not read', DB_FILE, (e as Error).message);
    return null;
  }
}

/** The local safety copy. A failure here is logged and never stops the site or the database. */
function writeFile(cache: DbShape) {
  try {
    writeFileNow(cache);
  } catch (e) {
    console.error('[kibabu] could not write the safety copy', DB_FILE, (e as Error).message);
  }
}
function writeFileNow(cache: DbShape) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  renameSync(tmp, DB_FILE);
}

/* ------------------------------------------------------------------ MySQL / PostgreSQL */

type Table = 'kb_bookings' | 'kb_messages' | 'kb_cars' | 'kb_content';
type Row = { table: Table; key: string; json: string; values: unknown[] };
type DbRow = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The little that differs between MySQL and PostgreSQL. SQL is written with ? placeholders. */
interface Driver {
  kind: 'mysql' | 'postgres';
  query(sql: string, params?: unknown[]): Promise<DbRow[]>;
  /** run several statements in one transaction */
  transaction(fn: (q: (sql: string, params?: unknown[]) => Promise<unknown>) => Promise<void>): Promise<void>;
  schema: string[];
  upsert: Record<Table, string>;
  addUpload: string;
  addUploadIfMissing: string;
}

const MYSQL_TABLE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kb_bookings (
    id VARCHAR(64) NOT NULL PRIMARY KEY, ref VARCHAR(32) NOT NULL, status VARCHAR(20) NOT NULL, car_id VARCHAR(80) NOT NULL,
    pickup_at DATETIME NOT NULL, return_at DATETIME NOT NULL, customer_name VARCHAR(200) NOT NULL, customer_email VARCHAR(254) NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL, data LONGTEXT NOT NULL,
    KEY idx_ref (ref), KEY idx_pickup (pickup_at), KEY idx_status (status)
  ) ${MYSQL_TABLE}`,
  `CREATE TABLE IF NOT EXISTS kb_messages (
    id VARCHAR(64) NOT NULL PRIMARY KEY, email VARCHAR(254) NOT NULL, created_at DATETIME NOT NULL, data LONGTEXT NOT NULL, KEY idx_created (created_at)
  ) ${MYSQL_TABLE}`,
  `CREATE TABLE IF NOT EXISTS kb_cars (id VARCHAR(80) NOT NULL PRIMARY KEY, position INT NOT NULL DEFAULT 0, data LONGTEXT NOT NULL) ${MYSQL_TABLE}`,
  `CREATE TABLE IF NOT EXISTS kb_content (name VARCHAR(40) NOT NULL PRIMARY KEY, data LONGTEXT NOT NULL, updated_at DATETIME NOT NULL) ${MYSQL_TABLE}`,
  `CREATE TABLE IF NOT EXISTS kb_uploads (name VARCHAR(120) NOT NULL PRIMARY KEY, mime VARCHAR(40) NOT NULL, data MEDIUMBLOB NOT NULL, created_at DATETIME NOT NULL) ${MYSQL_TABLE}`,
];
const PG_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kb_bookings (
    id VARCHAR(64) PRIMARY KEY, ref VARCHAR(32) NOT NULL, status VARCHAR(20) NOT NULL, car_id VARCHAR(80) NOT NULL,
    pickup_at TIMESTAMPTZ NOT NULL, return_at TIMESTAMPTZ NOT NULL, customer_name VARCHAR(200) NOT NULL, customer_email VARCHAR(254) NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL, data TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS kb_bookings_ref ON kb_bookings (ref)`,
  `CREATE INDEX IF NOT EXISTS kb_bookings_pickup ON kb_bookings (pickup_at)`,
  `CREATE INDEX IF NOT EXISTS kb_bookings_status ON kb_bookings (status)`,
  `CREATE TABLE IF NOT EXISTS kb_messages (id VARCHAR(64) PRIMARY KEY, email VARCHAR(254) NOT NULL, created_at TIMESTAMPTZ NOT NULL, data TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS kb_messages_created ON kb_messages (created_at)`,
  `CREATE TABLE IF NOT EXISTS kb_cars (id VARCHAR(80) PRIMARY KEY, position INT NOT NULL DEFAULT 0, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS kb_content (name VARCHAR(40) PRIMARY KEY, data TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS kb_uploads (name VARCHAR(120) PRIMARY KEY, mime VARCHAR(40) NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL)`,
];

const COLS: Record<Table, { key: string; cols: string[] }> = {
  kb_bookings: { key: 'id', cols: ['id', 'ref', 'status', 'car_id', 'pickup_at', 'return_at', 'customer_name', 'customer_email', 'total', 'created_at', 'data'] },
  kb_messages: { key: 'id', cols: ['id', 'email', 'created_at', 'data'] },
  kb_cars: { key: 'id', cols: ['id', 'position', 'data'] },
  kb_content: { key: 'name', cols: ['name', 'data', 'updated_at'] },
};
function upserts(kind: Driver['kind']): Record<Table, string> {
  const out = {} as Record<Table, string>;
  for (const [table, { key, cols }] of Object.entries(COLS) as [Table, (typeof COLS)[Table]][]) {
    const head = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    const rest = cols.filter((c) => c !== key && c !== 'created_at');
    out[table] = kind === 'mysql'
      ? `${head} ON DUPLICATE KEY UPDATE ${rest.map((c) => `${c} = VALUES(${c})`).join(', ')}`
      : `${head} ON CONFLICT (${key}) DO UPDATE SET ${rest.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`;
  }
  return out;
}
const KEY_COL: Record<Table, string> = { kb_bookings: 'id', kb_messages: 'id', kb_cars: 'id', kb_content: 'name' };

const date = (iso: string | undefined) => {
  const d = new Date(iso ?? 0);
  return isNaN(+d) ? new Date(0) : d;
};
const cut = (v: unknown, n: number) => String(v ?? '').slice(0, n);

/** All rows the data should have in the database, with the columns used for searching. */
function rowsOf(d: DbShape): Row[] {
  const rows: Row[] = [];
  for (const b of d.bookings) {
    const json = JSON.stringify(b);
    rows.push({ table: 'kb_bookings', key: b.id, json, values: [b.id, cut(b.ref, 32), cut(b.status, 20), cut(b.carId, 80), date(b.pickupAt), date(b.returnAt), cut(b.customer?.name, 200), cut(b.customer?.email, 254), b.quote?.total ?? 0, date(b.createdAt), json] });
  }
  for (const m of d.messages) {
    const json = JSON.stringify(m);
    rows.push({ table: 'kb_messages', key: m.id, json, values: [m.id, cut(m.email, 254), date(m.createdAt), json] });
  }
  d.cars.forEach((c, i) => {
    const json = JSON.stringify(c);
    rows.push({ table: 'kb_cars', key: c.id, json: i + json, values: [c.id, i, json] });
  });
  const content: Record<string, unknown> = { ...d.content, missing: d.missing ?? [], settings: d.settings ?? {} };
  for (const name of [...CONTENT_KEYS, 'missing', 'settings']) {
    const json = JSON.stringify(content[name] ?? null);
    rows.push({ table: 'kb_content', key: name, json, values: [name, json, new Date()] });
  }
  return rows;
}

class Sql {
  /** what the database holds now, by "table|key" → json */
  private saved = new Map<string, string>();
  private running: Promise<void> | null = null;
  private again = false;
  private retry: ReturnType<typeof setTimeout> | null = null;
  lastError: string | null = null;

  constructor(readonly db: Driver) {}

  async setup(): Promise<void> {
    for (const s of this.db.schema) await this.db.query(s);
  }

  /** Load everything. Returns null when the database is still empty. */
  async load(): Promise<DbShape | null> {
    const q = (sql: string) => this.db.query(sql);
    const content = await q('SELECT name, data FROM kb_content');
    if (!content.length) return null;
    const c: Record<string, unknown> = {};
    for (const r of content) c[r['name']] = JSON.parse(r['data']);
    const d: DbShape = {
      bookings: (await q('SELECT data FROM kb_bookings ORDER BY created_at')).map((r) => JSON.parse(r['data'])),
      messages: (await q('SELECT data FROM kb_messages ORDER BY created_at')).map((r) => JSON.parse(r['data'])),
      cars: (await q('SELECT data FROM kb_cars ORDER BY position')).map((r) => JSON.parse(r['data'])),
      content: Object.fromEntries(CONTENT_KEYS.filter((k) => c[k] != null).map((k) => [k, c[k]])) as unknown as SiteContent,
      missing: (c['missing'] as MissingLink[] | null) ?? [],
      settings: (c['settings'] as StoredSettings | null) ?? {},
    };
    for (const r of rowsOf(d)) this.saved.set(r.table + '|' + r.key, r.json);
    return d;
  }

  /** Save what changed since last time (runs one at a time; a change during a save triggers another). */
  flush(): Promise<void> {
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.sync();
        } while (this.again);
        this.lastError = null;
      } catch (e) {
        this.lastError = (e as Error).message;
        console.error('[kibabu] database save failed, will retry in 10 s:', this.lastError);
        if (!this.retry) this.retry = setTimeout(() => { this.retry = null; void this.flush(); }, 10_000);
        throw e;
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async sync() {
    const d = G.__kbDb;
    if (!d) return;
    const want = new Map<string, Row>();
    for (const r of rowsOf(d)) want.set(r.table + '|' + r.key, r);
    const ups = [...want.entries()].filter(([k, r]) => this.saved.get(k) !== r.json);
    const deletes = [...this.saved.keys()].filter((k) => !want.has(k));
    if (!ups.length && !deletes.length) return;
    await this.db.transaction(async (q) => {
      for (const [, r] of ups) await q(this.db.upsert[r.table], r.values);
      for (const k of deletes) {
        const [table, key] = k.split('|') as [Table, string];
        await q(`DELETE FROM ${table} WHERE ${KEY_COL[table]} = ?`, [key]);
      }
    });
    for (const [k, r] of ups) this.saved.set(k, r.json);
    for (const k of deletes) this.saved.delete(k);
  }
}

/** ? → $1, $2 … for PostgreSQL (our SQL never has ? inside text) */
const pgSql = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => '$' + ++i); };

async function connect(): Promise<Sql | null> {
  const m = CONFIG.database;
  if (!m) return null;
  let driver: Driver;
  if (m.client === 'postgres') {
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({
      ...(m.url ? { connectionString: m.url } : { host: m.host, port: m.port, user: m.user, password: m.password, database: m.database }),
      ssl: m.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
    pool.on('error', (e) => console.error('[kibabu] PostgreSQL connection error:', e.message));
    driver = {
      kind: 'postgres',
      query: async (sql, params) => (await pool.query(pgSql(sql), params as unknown[])).rows,
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          await fn((sql, params) => c.query(pgSql(sql), params as unknown[]));
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK').catch(() => undefined);
          throw e;
        } finally {
          c.release();
        }
      },
      schema: PG_SCHEMA,
      upsert: upserts('postgres'),
      addUpload: 'INSERT INTO kb_uploads (name, mime, data, created_at) VALUES (?, ?, ?, ?)',
      addUploadIfMissing: 'INSERT INTO kb_uploads (name, mime, data, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (name) DO NOTHING',
    };
  } else {
    const mysql = (await import('mysql2/promise')).default;
    const pool: Pool = mysql.createPool({
      ...(m.url ? { uri: m.url } : { host: m.host, port: m.port, user: m.user, password: m.password, database: m.database }),
      connectionLimit: 5,
      timezone: 'Z',
      charset: 'utf8mb4',
      enableKeepAlive: true,
    });
    driver = {
      kind: 'mysql',
      query: async (sql, params) => (await pool.query<RowDataPacket[]>(sql, params))[0],
      transaction: async (fn) => {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await fn((sql, params) => conn.query(sql, params));
          await conn.commit();
        } catch (e) {
          await conn.rollback().catch(() => undefined);
          throw e;
        } finally {
          conn.release();
        }
      },
      schema: MYSQL_SCHEMA,
      upsert: upserts('mysql'),
      addUpload: 'INSERT INTO kb_uploads (name, mime, data, created_at) VALUES (?, ?, ?, ?)',
      addUploadIfMissing: 'INSERT IGNORE INTO kb_uploads (name, mime, data, created_at) VALUES (?, ?, ?, ?)',
    };
  }
  const sql = new Sql(driver);
  await sql.setup();
  return sql;
}

/* ------------------------------------------------------------------ public API */

let ready: Promise<void> | null = null;

/**
 * Bookings and messages that reached the local safety copy but not the database (e.g. the server restarted
 * while the database was down) are put back. A booking changed later in the safety copy (newer updatedAt) wins.
 */
function recover(d: DbShape, file: DbShape | null): number {
  if (!file) return 0;
  let n = 0;
  const byId = new Map(d.bookings.map((b, i) => [b.id, i]));
  for (const b of file.bookings ?? []) {
    const i = byId.get(b.id);
    if (i === undefined) { d.bookings.push(b); n++; }
    else if ((b.updatedAt ?? '') > (d.bookings[i].updatedAt ?? '')) { d.bookings[i] = b; n++; }
  }
  const msgIds = new Set(d.messages.map((m) => m.id));
  for (const m of file.messages ?? []) if (!msgIds.has(m.id)) { d.messages.push(m); n++; }
  return n;
}

/** Synchronous fallback (dev server, tests): JSON file only. */
function loadFileSync(): DbShape {
  if (G.__kbDb) return G.__kbDb;
  const file = readFile();
  const cache = file ? upgrade(file) : fresh();
  G.__kbDb = cache;
  if (!file) writeFile(cache);
  applyAddons(cache.content.addons);
  return cache;
}

export const db = {
  /**
   * Connect and load. Call once at start-up (the server waits for it before answering requests).
   * With a database: an empty database is filled from data/db.json (or the starter data).
   */
  init(): Promise<void> {
    ready ??= (async () => {
      const sql = await connect();
      G.__kbSql = sql;
      if (!sql) {
        loadFileSync();
        console.log('[kibabu] storage: JSON file', DB_FILE);
        return;
      }
      const data = await sql.load();
      if (data) {
        const n = recover(data, readFile());
        G.__kbDb = upgrade(data);
        console.log(`[kibabu] storage: ${label()} (${data.bookings.length} bookings, ${data.cars.length} cars)` + (n ? ` – recovered ${n} unsaved changes from ${DB_FILE}` : ''));
      } else {
        const file = readFile();
        G.__kbDb = file ? upgrade(file) : fresh();
        console.log(file ? `[kibabu] storage: ${label()} – imported ${G.__kbDb.bookings.length} bookings from ${DB_FILE}` : `[kibabu] storage: ${label()} – new database`);
        await migrateUploads(sql);
      }
      await sql.flush();
      writeFile(G.__kbDb!);
    })().then(
      () => applyAddons(G.__kbDb?.content.addons), // prices and extras saved in the admin
      (e) => {
        ready = null; // try again on the next request
        G.__kbSql = null;
        console.error(`[kibabu] cannot reach ${label()} yet:`, (e as Error).message);
        throw e;
      },
    );
    return ready;
  },

  read(): DbShape {
    return G.__kbDb ?? loadFileSync();
  },

  /** Mutate the data, mirror it to db.json and save it to the database in the background (see flush). */
  write<T>(fn: (data: DbShape) => T): T {
    const data = db.read();
    const result = fn(data);
    try {
      writeFile(data);
    } catch (e) {
      console.error('[kibabu] could not write', DB_FILE, (e as Error).message);
    }
    void G.__kbSql?.flush().catch(() => undefined);
    return result;
  },

  /** Wait until every change is in the database (max `ms`). Use before telling a guest their booking is saved. */
  async flush(ms = 5000): Promise<boolean> {
    const sql = G.__kbSql;
    if (!sql) return true;
    try {
      await Promise.race([sql.flush(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
      return true;
    } catch {
      return false;
    }
  },

  /** "mysql", "postgres" or "file", and the last database error if a save is failing. */
  status() {
    const sql = G.__kbSql;
    return { storage: sql ? sql.db.kind : 'file', error: sql?.lastError ?? null };
  },

  async saveUpload(name: string, mime: string, buf: Buffer): Promise<void> {
    const sql = G.__kbSql;
    if (sql) {
      await sql.db.query(sql.db.addUpload, [name, mime, buf, new Date()]);
      return;
    }
    mkdirSync(UPLOADS_DIR, { recursive: true });
    writeFileSync(join(UPLOADS_DIR, name), buf);
  },

  /** An uploaded photo, or null. */
  async getUpload(name: string): Promise<{ mime: string; data: Buffer } | null> {
    const sql = G.__kbSql;
    if (!sql) return null; // served from the uploads folder instead
    const rows = await sql.db.query('SELECT mime, data FROM kb_uploads WHERE name = ?', [name]);
    return rows[0] ? { mime: rows[0]['mime'], data: rows[0]['data'] } : null;
  },
};

const label = () => (CONFIG.database?.client === 'postgres' ? 'PostgreSQL' : 'MySQL');

/** Copy photos uploaded before the switch to a database into it. */
async function migrateUploads(sql: Sql) {
  if (!existsSync(UPLOADS_DIR)) return;
  const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif' };
  let n = 0;
  for (const f of readdirSync(UPLOADS_DIR)) {
    const mime = types[f.split('.').pop()?.toLowerCase() ?? ''];
    if (!mime) continue;
    await sql.db.query(sql.db.addUploadIfMissing, [f, mime, readFileSync(join(UPLOADS_DIR, f)), new Date()]);
    n++;
  }
  if (n) console.log(`[kibabu] imported ${n} uploaded photos into the database`);
}

/** Daily JSON export of all data in data/backups (keeps the last `keepDays`). Works with both storages. */
export function startBackups(keepDays = 14): void {
  const dir = join(DATA_DIR, 'backups');
  const run = () => {
    try {
      const data = G.__kbDb;
      if (!data) return;
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `db-${new Date().toISOString().slice(0, 10)}.json`);
      writeFileSync(file + '.tmp', JSON.stringify(data));
      renameSync(file + '.tmp', file);
      const files = readdirSync(dir).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      for (const f of files.slice(0, Math.max(0, files.length - keepDays))) unlinkSync(join(dir, f));
    } catch (e) {
      console.error('[kibabu] backup failed', (e as Error).message);
    }
  };
  void db.init().then(run, () => { /* database not reachable yet: the next request retries */ });
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

