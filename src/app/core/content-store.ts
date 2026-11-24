import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, PLATFORM_ID, TransferState, computed, inject, makeStateKey, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ABOUT, AboutContent } from '../../shared/about';
import { BLOG, BlogPost } from '../../shared/blog';
import { sortFleet } from '../../shared/business';
import { SiteContent, applyContent, localizeCars, localizeContent } from '../../shared/content';
import { FAQ, FaqGroup } from '../../shared/faq';
import { Lang } from '../../shared/i18n';
import { Car } from '../../shared/models';
import { Analytics } from './analytics';
import { Fleet } from './fleet';
import { LANG } from './i18n';

/** On the server: reads the latest content and cars, in the page's language, straight from the database. */
export const SERVER_DATA = new InjectionToken<(lang: Lang) => { content: SiteContent; cars: Car[] }>('SERVER_DATA');

const KEY = makeStateKey<{ content: SiteContent; cars: Car[] }>('kb-data');

/**
 * The admin-editable content (business details, About, FAQ, blog) and cars, in the visitor's
 * language, loaded before the app renders so every page – server or browser – shows the latest edits.
 */
@Injectable({ providedIn: 'root' })
export class ContentStore {
  private http = inject(HttpClient);
  private ts = inject(TransferState);
  private fleet = inject(Fleet);
  private lang = inject(LANG);
  private server = isPlatformServer(inject(PLATFORM_ID));
  private serverData = inject(SERVER_DATA, { optional: true });
  private analytics = inject(Analytics);

  readonly about = signal<AboutContent>(ABOUT);
  readonly faq = signal<FaqGroup[]>(FAQ);
  readonly blog = signal<BlogPost[]>(sortPosts(BLOG));
  readonly latestPost = computed(() => this.blog()[0]);
  /** bumps after content changes (for views that want to re-read) */
  readonly version = signal(0);

  async init(): Promise<void> {
    if (this.server) {
      const data = this.serverData?.(this.lang);
      if (data) {
        this.use(data.content, data.cars);
        this.ts.set(KEY, data);
      }
      return;
    }
    const cached = this.ts.get(KEY, null);
    if (cached) {
      this.use(cached.content, cached.cars);
      this.analytics.start();
      return;
    }
    // no server render (demo / static hosting): ask the API
    try {
      const content = await firstValueFrom(this.http.get<SiteContent>('/api/content'));
      this.use(content);
      this.analytics.start();
    } catch {
      if (this.lang !== 'en') {
        const { defaultContent } = await import('../../shared/content');
        this.use(defaultContent());
      }
    }
  }

  /** Apply new content (also used by the admin after saving). Full content (with translations) is localized here. */
  use(content: Partial<SiteContent>, cars?: Car[]) {
    const c = content.i18n && content.about ? localizeContent(content as SiteContent, this.lang) : content;
    applyContent(c);
    if (c.about) this.about.set(c.about);
    if (c.faq) this.faq.set(c.faq);
    if (c.blog) this.blog.set(sortPosts(c.blog));
    if (cars) {
      const list = content.i18n ? localizeCars(cars, content as SiteContent, this.lang) : cars;
      this.fleet.cars.set(sortFleet(list.filter((x) => x.active)));
    }
    this.version.update((v) => v + 1);
  }
}

function sortPosts(posts: BlogPost[]) {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}
