import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { busyInterceptor } from './core/busy';
import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEnGb from '@angular/common/locales/en-GB';
import localeEs from '@angular/common/locales/es';
import localeIt from '@angular/common/locales/it';
import localeRu from '@angular/common/locales/ru';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, inject, provideAppInitializer } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { KbDateAdapter } from './core/date-adapter';
import { MatIconRegistry } from '@angular/material/icon';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { demoApiInterceptor } from './core/demo-api';
import { DEMO } from './core/env';
import { ContentStore } from './core/content-store';
import { routes } from './app.routes';
import { I18n, LANG, langHeaderInterceptor } from './core/i18n';
import { LANG_LOCALE, Lang, isLang, langFromPath, langPrefix } from '../shared/i18n';

for (const l of [localeEnGb, localeIt, localeRu, localeEs, localeDe]) registerLocaleData(l);
const NG_LOCALE: Record<Lang, string> = { en: 'en-GB', it: 'it', ru: 'ru', es: 'es', de: 'de' };

/** Browser: language from the address (/it/…), or the saved choice in the demo build. */
function browserLang(): Lang {
  if (typeof location === 'undefined') return 'en';
  if (DEMO) {
    try { const s = localStorage.getItem('kb_lang'); return isLang(s) ? s : 'en'; } catch { return 'en'; }
  }
  return langFromPath(location.pathname);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LANG, useFactory: browserLang },
    // the router works below /it/, /ru/… so every link stays in the visitor's language
    ...(DEMO ? [] : [{ provide: APP_BASE_HREF, useFactory: () => langPrefix(inject(LANG)) + '/' }]),
    { provide: LOCALE_ID, useFactory: () => NG_LOCALE[inject(LANG)] },
    { provide: MAT_DATE_LOCALE, useFactory: () => LANG_LOCALE[inject(LANG)] },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions(),
      ...(DEMO ? [withHashLocation()] : []),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors(DEMO ? [busyInterceptor, langHeaderInterceptor, demoApiInterceptor] : [busyInterceptor, langHeaderInterceptor])),
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: KbDateAdapter }, // typed dates like 25/11/2026
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
    provideAppInitializer(async () => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
      const i18n = inject(I18n);
      const store = inject(ContentStore);
      await i18n.load();
      return store.init();
    }),
  ],
};
