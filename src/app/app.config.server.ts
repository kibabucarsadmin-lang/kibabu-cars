import { ApplicationConfig, REQUEST, inject, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { db } from '../server/db';
import { CONFIG } from '../server/config';
import { appConfig } from './app.config';
import { SERVER_DATA } from './core/content-store';
import { serverRoutes } from './app.routes.server';
import { LANG } from './core/i18n';
import { Lang, isLang } from '../shared/i18n';
import { localizeContent, localizeCars } from '../shared/content';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // set by server.ts from the /it/, /ru/… prefix
    {
      provide: LANG,
      useFactory: (): Lang => {
        const l = inject(REQUEST, { optional: true })?.headers.get('x-kb-lang');
        return isLang(l) ? l : 'en';
      },
    },
    // pages are rendered from the live database, so admin edits show immediately
    {
      provide: SERVER_DATA,
      useValue: (lang: Lang) => {
        const { content, cars } = db.read();
        const local = localizeContent(content, lang);
        return { content: { ...local, business: { ...local.business, siteUrl: CONFIG.siteUrl } }, cars: localizeCars(cars, content, lang) };
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
