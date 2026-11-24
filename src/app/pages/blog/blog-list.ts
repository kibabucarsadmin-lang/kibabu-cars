import { tx } from '../../../shared/i18n';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BlogPost } from '../../../shared/blog';
import { ContentStore } from '../../core/content-store';
import { whatsappLink } from '../../../shared/business';
import { Seo } from '../../core/seo';
import { Photo } from '../../shared/photo';
import { Reveal } from '../../shared/reveal';
import { TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-blog-list',
  imports: [TPipe, DatePipe, RouterLink, MatIconModule, Photo, Reveal],
  template: `
    @if (lead(); as p) {
      <section class="cover">
        <a class="cover-link" [routerLink]="['/blog', p.slug]" [attr.aria-label]="'Read: {title}' | t: { title: p.title }">
          <kb-photo class="cover-img" [src]="p.cover.src" [alt]="p.cover.alt" [eager]="true" fallbackLabel=" " />
          <div class="cover-shade"></div>
          <div class="wrap cover-copy">
            <p class="kicker"><span class="chip">{{ p.tag }}</span> {{ 'Latest story' | t }}</p>
            <h1>{{ p.title }}</h1>
            <p class="cover-ex">{{ p.excerpt }}</p>
            <p class="meta-light">{{ p.date | date: 'd MMMM y' }}, {{ '{n} min read' | t: { n: p.minutes } }} <span class="arrow" aria-hidden="true"><mat-icon>arrow_outward</mat-icon></span></p>
          </div>
        </a>
      </section>
    }

    <div class="filters-wrap">
      <div class="wrap filters">
        <div class="tags" role="tablist" [attr.aria-label]="'Filter by topic' | t">
          @for (t of tags; track t) {
            <button type="button" role="tab" [attr.aria-selected]="tag() === t" [class.on]="tag() === t" (click)="tag.set(t)">{{ t }}</button>
          }
        </div>
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" [placeholder]="'Search the blog' | t" [value]="q()" (input)="q.set($any($event.target).value)" [attr.aria-label]="'Search the blog' | t" />
        </label>
      </div>
    </div>

    <section class="band list">
      <div class="wrap">
        @if (!rest().length) {
          <p class="empty">{{ 'No stories match “{q}”. Try another word, or' | t: { q: q() } }} <button type="button" (click)="q.set(''); tag.set('All')">{{ 'show all stories' | t }}</button>.</p>
        }
        <div class="mosaic">
          @for (p of rest(); track p.slug; let n = $index) {
            <a class="story" [class.wide]="n % 5 === 0" [routerLink]="['/blog', p.slug]" kbReveal [delay]="(n % 3) * 90">
              <div class="story-img">
                <kb-photo [src]="p.cover.src" [alt]="p.cover.alt" />
                <span class="chip on-img">{{ p.tag }}</span>
              </div>
              <div class="story-txt">
                <h2>{{ p.title }}</h2>
                <p>{{ p.excerpt }}</p>
                <span class="meta">{{ p.date | date: 'd MMM y' }}, {{ '{n} min read' | t: { n: p.minutes } }}</span>
              </div>
            </a>
          }
        </div>

        <aside class="plan" kbReveal>
          <div>
            <h2>{{ 'Planning a Zanzibar road trip?' | t }}</h2>
            <p>{{ 'Tell us your dates and who’s travelling. We’ll suggest the right car and a route, no strings attached.' | t }}</p>
          </div>
          <a class="wa-btn" [href]="wa" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> {{ 'Ask us on WhatsApp' | t }}</a>
        </aside>
      </div>
    </section>
  `,
  styles: `
    /* Cover story */
    .cover { position: relative; }
    .cover-link { position: relative; display: flex; align-items: flex-end; min-height: clamp(460px, 74vh, 700px); color: #fff; text-decoration: none; isolation: isolate; overflow: hidden; }
    .cover-img { position: absolute; inset: 0; z-index: -2; }
    .cover-img ::ng-deep img { transform: scale(1.04); transition: transform 1.6s cubic-bezier(.2,.7,.2,1); animation: settle 2s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes settle { from { transform: scale(1.14); } }
    .cover-link:hover .cover-img ::ng-deep img { transform: scale(1.08); }
    .cover-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, rgba(6,30,38,.92) 0%, rgba(6,30,38,.6) 45%, rgba(6,30,38,.2) 80%), linear-gradient(90deg, rgba(6,30,38,.55) 0%, rgba(6,30,38,0) 65%); }
    .cover-copy { padding-bottom: clamp(36px, 6vw, 72px); max-width: var(--max); }
    .kicker { display: flex; align-items: center; gap: 12px; color: #fff; font-weight: 700; text-shadow: 0 1px 8px rgba(0,0,0,.5); margin-bottom: 18px; animation: up .8s .1s both; }
    .cover h1 { color: #fff; font-size: clamp(2.3rem, 5.6vw, 4.4rem); max-width: 15em; line-height: 1.04; animation: up .9s .2s both; }
    .cover-ex { color: #d4f4f1; font-size: clamp(1.05rem, 1.6vw, 1.25rem); max-width: 52ch; animation: up .9s .3s both; }
    .meta-light { display: flex; align-items: center; gap: 12px; color: #cfe9e6; margin: 0; animation: up .9s .4s both; }
    .arrow { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--brass-light); color: var(--mangrove); transition: transform .3s; }
    .cover-link:hover .arrow { transform: rotate(45deg); }
    @keyframes up { from { opacity: 0; transform: translateY(18px); } }
    .chip { display: inline-block; padding: 5px 12px; border-radius: 999px; background: var(--brass-light); color: var(--mangrove); font-size: .8rem; font-weight: 800; }

    /* Filters */
    .filters-wrap { position: sticky; top: var(--header-h); z-index: 20; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
    .filters { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 12px; padding-bottom: 12px; }
    .tags { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
    .tags::-webkit-scrollbar { display: none; }
    .tags button { flex: none; font: inherit; font-weight: 700; font-size: .92rem; padding: 9px 16px; min-height: 42px; border-radius: 999px; border: 1px solid transparent; background: transparent; color: var(--muted); cursor: pointer; transition: all .2s; }
    .tags button:hover { color: var(--ink); background: #fff; }
    .tags button.on { background: var(--mangrove); color: #fff; }
    .search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 0 14px; min-height: 44px; flex: 0 1 280px; }
    .search:focus-within { border-color: var(--brass); box-shadow: 0 0 0 3px rgba(255,197,61,.25); }
    .search mat-icon { color: var(--muted); }
    .search input { border: 0; outline: 0; font: inherit; font-size: 16px; background: transparent; width: 100%; }

    /* Mosaic */
    .list { padding-top: 48px; }
    .mosaic { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 48px 28px; }
    .story { display: flex; flex-direction: column; text-decoration: none; color: inherit; }
    .story.wide { grid-column: span 2; display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; align-items: center; }
    .story-img { position: relative; aspect-ratio: 4 / 3; border-radius: var(--r-lg); overflow: hidden; }
    .story.wide .story-img { aspect-ratio: 16 / 11; }
    .story-img kb-photo { position: absolute; inset: 0; }
    .story-img ::ng-deep img { transition: transform .8s cubic-bezier(.2,.7,.2,1); }
    .story:hover .story-img ::ng-deep img { transform: scale(1.06); }
    .on-img { position: absolute; left: 14px; top: 14px; background: rgba(255,255,255,.94); color: var(--mangrove); }
    .story-txt { padding-top: 16px; }
    .story.wide .story-txt { padding-top: 0; }
    .story h2 { font-size: 1.45rem; line-height: 1.2; margin-bottom: 10px; background: linear-gradient(var(--brass-light), var(--brass-light)) 0 100% / 0 2px no-repeat; transition: background-size .45s; display: inline; }
    .story.wide h2 { font-size: clamp(1.7rem, 2.6vw, 2.3rem); }
    .story:hover h2 { background-size: 100% 2px; }
    .story p { color: var(--muted); margin: 12px 0; }
    .meta { font-size: .88rem; color: var(--brass); font-weight: 600; }
    .empty { text-align: center; color: var(--muted); padding: 40px 0; }
    .empty button { font: inherit; color: var(--ocean); background: none; border: 0; text-decoration: underline; cursor: pointer; }

    .plan { margin-top: 80px; padding: clamp(24px, 4vw, 44px); border-radius: var(--r-lg); background:
      radial-gradient(600px 200px at 100% 0%, rgba(255,197,61,.35), transparent 70%), var(--mangrove); color: #fff;
      display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
    .plan h2 { color: #fff; margin-bottom: 6px; }
    .plan p { color: #b8d6d8; margin: 0; }
    .wa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 22px; border-radius: 999px; background: var(--wa); color: #fff; font-weight: 800; text-decoration: none; transition: transform .2s; }
    .wa-btn:hover { transform: translateY(-2px); }

    @media (max-width: 960px) {
      .mosaic { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .story.wide { grid-column: 1 / -1; }
    }
    @media (max-width: 640px) {
      .filters { flex-direction: column; align-items: stretch; gap: 8px; }
      .search { flex-basis: auto; }
      .mosaic { grid-template-columns: 1fr; gap: 36px; }
      .story.wide { display: flex; }
      .story.wide .story-txt { padding-top: 16px; }
    }
    @media (prefers-reduced-motion: reduce) { .cover-img ::ng-deep img, .kicker, .cover h1, .cover-ex, .meta-light { animation: none; } }
  `,
})
export class BlogList {
  private readonly store = inject(ContentStore);
  protected readonly tags = ['All', ...Array.from(new Set(this.store.blog().map((p) => p.tag)))];
  protected readonly tag = signal('All');
  protected readonly q = signal('');
  protected readonly wa = whatsappLink('Hello Kibabu Cars, can you help me plan my Zanzibar trip? Dates: ... People: ...');
  private readonly sorted = this.store.blog();
  protected readonly lead = computed<BlogPost | undefined>(() => this.sorted[0]);
  protected readonly rest = computed(() => {
    const t = this.tag();
    const q = this.q().trim().toLowerCase();
    return this.sorted
      .filter((p) => p !== this.lead() || t !== 'All' || q)
      .filter((p) => t === 'All' || p.tag === t)
      .filter((p) => !q || (p.title + ' ' + p.excerpt + ' ' + p.tag).toLowerCase().includes(q));
  });

  constructor() {
    const seo = inject(Seo);
    seo.set({
      title: tx('Zanzibar Travel & Driving Blog'),
      description: tx('Guides from Kibabu Cars: the Zanzibar driving permit, airport pickup, driving tips, choosing a rental car and road trips around the island.'),
      path: '/blog',
      image: this.lead()?.cover.src,
    });
    seo.breadcrumbs([{ name: tx('Home'), path: '/' }, { name: tx('Blog'), path: '/blog' }]);
  }
}
