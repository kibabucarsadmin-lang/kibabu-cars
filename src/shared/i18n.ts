/**
 * Languages. English is the source: every translatable text is written in English in the
 * code and looked up in the language's dictionary (falls back to English when missing).
 * Dictionaries (i18n/<lang>.ts) map the English text to the translation and load on demand.
 * scripts/i18n-keys.mjs lists every text in i18n/keys.ts and reports missing translations.
 */
export const LANGS = ['en', 'it', 'ru', 'es', 'de'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Record<Lang, string> = { en: 'English', it: 'Italiano', ru: 'Русский', es: 'Español', de: 'Deutsch' };
export const LANG_LOCALE: Record<Lang, string> = { en: 'en-GB', it: 'it-IT', ru: 'ru-RU', es: 'es-ES', de: 'de-DE' };
/** Open Graph locale */
export const LANG_OG: Record<Lang, string> = { en: 'en_GB', it: 'it_IT', ru: 'ru_RU', es: 'es_ES', de: 'de_DE' };

export type Dict = Record<string, string>;

/** Marks an English text in data (labels, hints…) as translatable; shown with the | t pipe. */
export const tx = (s: string): string => s;
export type Params = Record<string, string | number | null | undefined>;

export const isLang = (x: unknown): x is Lang => typeof x === 'string' && (LANGS as readonly string[]).includes(x);

/** '/it/fleet' → 'it'; '/fleet' → 'en' */
export function langFromPath(path: string): Lang {
  const seg = path.split(/[/?#]/)[1];
  return isLang(seg) && seg !== 'en' ? seg : 'en';
}

/** '' for English, '/it' for Italian… */
export const langPrefix = (lang: Lang) => (lang === 'en' ? '' : `/${lang}`);

/** Path of the same page in another language: ('/it/fleet', 'de') → '/de/fleet' */
export function switchPath(path: string, to: Lang): string {
  const bare = path.replace(/^\/(it|ru|es|de)(?=\/|$|\?|#)/, '') || '/';
  const out = langPrefix(to) + (bare === '/' && to !== 'en' ? '' : bare);
  return out || '/';
}

export function fill(s: string, params?: Params): string {
  return params ? s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : s;
}

/** Loads a dictionary (its own small chunk per language). */
export async function loadDict(lang: Lang): Promise<Dict> {
  if (lang === 'en') return {};
  const mod =
    lang === 'it' ? await import('./i18n/it') :
    lang === 'ru' ? await import('./i18n/ru') :
    lang === 'es' ? await import('./i18n/es') :
    await import('./i18n/de');
  return mod.T;
}

/**
 * Translations typed in the admin (e.g. for extra services), by language then English text.
 * They win over the built-in dictionary. Filled by applyContent.
 */
export const CUSTOM_T: Partial<Record<Lang, Record<string, string>>> = {};

export function translate(dict: Dict, text: string, params?: Params, lang?: Lang): string {
  const custom = lang && lang !== 'en' ? CUSTOM_T[lang] : undefined;
  const one = (s: string) => custom?.[s] ?? dict[s] ?? s;
  if (params) {
    // names passed as values (e.g. an extra service) are translated too; numbers and prices stay as they are
    params = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? one(v) : v]));
  }
  return fill(one(text), params);
}
