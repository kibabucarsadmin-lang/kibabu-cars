import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, InjectionToken, Pipe, PipeTransform, inject } from '@angular/core';
import { Dict, LANG_LOCALE, LANG_NAMES, LANGS, Lang, Params, langPrefix, loadDict, translate } from '../../shared/i18n';

/** The page's language (from the URL, or the saved choice in the demo build). */
export const LANG = new InjectionToken<Lang>('LANG');

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = inject(LANG);
  readonly locale = LANG_LOCALE[this.lang];
  readonly langs = LANGS.map((id) => ({ id, name: LANG_NAMES[id] }));
  private dict: Dict = {};
  private doc = inject(DOCUMENT);

  async load(): Promise<void> {
    this.dict = await loadDict(this.lang);
    this.doc.documentElement.lang = this.lang;
  }

  /** Translate an English text. `{name}` placeholders are filled from params. */
  t(text: string, params?: Params): string {
    return translate(this.dict, text, params, this.lang);
  }

  /** Site path in this language: '/fleet' → '/it/fleet' */
  path(p: string): string {
    return langPrefix(this.lang) + (p === '/' && this.lang !== 'en' ? '' : p) || '/';
  }

  date(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
    return new Date(d).toLocaleDateString(this.locale, opts);
  }
}

/** {{ 'See cars and prices' | t }}  ·  {{ 'From {price} a day' | t: { price: 25 } }} */
@Pipe({ name: 't' })
export class TPipe implements PipeTransform {
  private i18n = inject(I18n);
  transform(text: string | null | undefined, params?: Params): string {
    return text ? this.i18n.t(text, params) : '';
  }
}

/** Tells the API which language to answer in (car texts, error messages, booking emails). */
export const langHeaderInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith('/api/') ? next(req.clone({ setHeaders: { 'x-kb-lang': inject(LANG) } })) : next(req);
