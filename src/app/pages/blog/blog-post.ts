import { tx } from '../../../shared/i18n';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BlogBlock } from '../../../shared/blog';
import { ContentStore } from '../../core/content-store';
import { BUSINESS } from '../../../shared/business';
import { slugify } from '../../../shared/content';
import { Fleet } from '../../core/fleet';
import { Seo } from '../../core/seo';
import { Photo } from '../../shared/photo';
import { Reveal } from '../../shared/reveal';
import { NotFound } from '../not-found';
import { TPipe } from '../../core/i18n';

interface Block extends BlogBlock { id?: string; }

@Component({
  selector: 'kb-blog-post',
  imports: [TPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, Photo, Reveal, NotFound],
  template: `
    @if (post(); as p) {
      <div class="progress" aria-hidden="true"><span [style.transform]="'scaleX(' + progress() + ')'"></span></div>
      <article itemscope itemtype="https://schema.org/BlogPosting">
        <header class="hero">
          <kb-photo class="hero-img" [src]="p.cover.src" [alt]="p.cover.alt" [eager]="true" fallbackLabel=" " [style.transform]="'translateY(' + parallax() + 'px)'" />
          <div class="hero-shade"></div>
          <div class="wrap hero-copy">
            <nav class="crumbs" [attr.aria-label]="'Breadcrumb' | t"><a routerLink="/">{{ 'Home' | t }}</a><mat-icon>chevron_right</mat-icon><a routerLink="/blog">{{ 'Blog' | t }}</a><mat-icon>chevron_right</mat-icon><span>{{ p.tag }}</span></nav>
            <h1 itemprop="headline">{{ p.title }}</h1>
            <p class="dek">{{ p.excerpt }}</p>
            <div class="byline">
              <span class="avatar" aria-hidden="true"><img src="logo-badge.png" alt="" width="40" height="40" /></span>
              <span><strong>{{ 'Kibabu Cars team' | t }}</strong><br /><time [attr.datetime]="p.date" itemprop="datePublished">{{ p.date | date: 'd MMMM y' }}</time>, {{ '{n} min read' | t: { n: p.minutes } }}</span>
            </div>
          </div>
        </header>

        <div class="wrap layout">
          <aside class="rail" [attr.aria-label]="'On this page' | t">
            @if (toc().length > 1) {
              <p class="rail-title">{{ 'On this page' | t }}</p>
              <ol class="toc">
                @for (t of toc(); track t.id) {
                  <li [class.on]="active() === t.id"><a [href]="'#' + t.id" (click)="go($event, t.id)">{{ t.h }}</a></li>
                }
              </ol>
            }
            <p class="rail-title">{{ 'Share' | t }}</p>
            <div class="share">
              <a [href]="shareWa()" target="_blank" rel="noopener" [attr.aria-label]="'Share on WhatsApp' | t"><mat-icon>chat</mat-icon></a>
              <a [href]="shareFb()" target="_blank" rel="noopener" [attr.aria-label]="'Share on Facebook' | t"><span class="fb">f</span></a>
              <button type="button" (click)="copy()" [attr.aria-label]="(copied() ? 'Link copied' : 'Copy link') | t"><mat-icon>{{ copied() ? 'check' : 'link' }}</mat-icon></button>
            </div>
          </aside>

          <div class="body" itemprop="articleBody">
            @for (b of blocks(); track $index; let i = $index) {
              @if (b.h) { <h2 [id]="b.id" kbReveal>{{ b.h }}</h2> }
              @if (b.p) { <p [class.first]="i === firstP()" kbReveal>{{ b.p }}</p> }
              @if (b.list) {
                <ul kbReveal>
                  @for (li of b.list; track $index) { <li>{{ li }}</li> }
                </ul>
              }
              @if (b.tip) {
                <aside class="tip" kbReveal><mat-icon>lightbulb</mat-icon><div><strong>{{ 'Good to know' | t }}</strong><p>{{ b.tip }}</p></div></aside>
              }
            }

            <section class="book-cta" kbReveal>
              @if (car(); as c) { <kb-photo class="cta-img" [src]="c.image" [alt]="c.name" /> }
              <div class="cta-copy">
                <h2>{{ 'Drive it yourself' | t }}</h2>
                <p>{{ 'Cars from {price} a day with insurance, unlimited kilometres and free airport delivery. Booking takes two minutes and is confirmed instantly.' | t: { price: '$' + cheapest() } }}</p>
                <div class="cta-btns">
                  <a mat-flat-button class="btn-brass btn-lg" routerLink="/book">{{ 'Book a car' | t }}</a>
                  <a mat-stroked-button class="btn-lg" routerLink="/fleet">{{ 'See the cars' | t }}</a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </article>

      @if (others().length) {
        <section class="band band--paper more">
          <div class="wrap">
            <div class="more-head"><h2>{{ 'Keep reading' | t }}</h2><a routerLink="/blog">{{ 'All stories' | t }}</a></div>
            <div class="more-grid">
              @for (o of others(); track o.slug; let n = $index) {
                <a class="more-card" [routerLink]="['/blog', o.slug]" kbReveal [delay]="n * 100">
                  <div class="more-img"><kb-photo [src]="o.cover.src" [alt]="o.cover.alt" /></div>
                  <span class="more-tag">{{ o.tag }}</span>
                  <h3>{{ o.title }}</h3>
                  <span class="more-meta">{{ '{n} min read' | t: { n: o.minutes } }}</span>
                </a>
              }
            </div>
          </div>
        </section>
      }
    } @else {
      <kb-not-found />
    }
  `,
  styles: `
    .progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 120; pointer-events: none; }
    .progress span { display: block; height: 100%; background: linear-gradient(90deg, #00a6a6, var(--brass-light)); transform-origin: left; }

    .hero { position: relative; min-height: clamp(480px, 78vh, 760px); display: flex; align-items: flex-end; color: #fff; overflow: hidden; isolation: isolate; }
    .hero-img { position: absolute; inset: -6% 0 -6% 0; z-index: -2; will-change: transform; }
    .hero-img ::ng-deep img { animation: settle 1.8s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes settle { from { transform: scale(1.12); filter: saturate(.7); } }
    .hero-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, rgba(6,30,38,.95) 0%, rgba(6,30,38,.55) 50%, rgba(6,30,38,.15)); }
    .hero-copy { padding-bottom: clamp(36px, 6vw, 64px); max-width: 980px; margin-left: max(var(--gutter), calc((100% - var(--max)) / 2 + var(--gutter))); }
    .crumbs { display: flex; align-items: center; gap: 2px; color: #cfe9e6; font-size: .9rem; margin-bottom: 18px; flex-wrap: wrap; }
    .crumbs a { color: #cfe9e6; text-decoration: none; } .crumbs a:hover { color: #fff; }
    .crumbs mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: .6; }
    .crumbs span { color: var(--brass-light); font-weight: 700; }
    .hero h1 { color: #fff; font-size: clamp(2.3rem, 5.4vw, 4.2rem); line-height: 1.05; max-width: 16em; animation: up .9s .1s both; }
    .dek { font-size: clamp(1.08rem, 1.7vw, 1.3rem); color: #d4f4f1; max-width: 50ch; animation: up .9s .2s both; }
    .byline { display: flex; align-items: center; gap: 12px; color: #cfe9e6; font-size: .95rem; animation: up .9s .3s both; }
    .byline strong { color: #fff; }
    .avatar img { width: 40px; height: 40px; border-radius: 50%; box-shadow: 0 0 0 2px var(--brass-light); }
    @keyframes up { from { opacity: 0; transform: translateY(16px); } }

    .layout { display: grid; grid-template-columns: 220px minmax(0, 680px); gap: clamp(32px, 6vw, 96px); justify-content: center; padding-top: 56px; padding-bottom: 80px; }
    .rail { position: sticky; top: calc(var(--header-h) + 32px); align-self: start; }
    .rail-title { font-size: .85rem; font-weight: 800; color: var(--muted); margin: 0 0 10px; }
    .toc { list-style: none; padding: 0; margin: 0 0 32px; border-left: 2px solid var(--line); }
    .toc li { margin-left: -2px; border-left: 2px solid transparent; transition: border-color .25s; }
    .toc li.on { border-color: var(--brass); }
    .toc a { display: block; padding: 7px 0 7px 14px; color: var(--muted); text-decoration: none; font-size: .93rem; line-height: 1.35; transition: color .2s; }
    .toc li.on a, .toc a:hover { color: var(--ink); }
    .share { display: flex; gap: 8px; }
    .share a, .share button { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; transition: transform .2s, border-color .2s; text-decoration: none; }
    .share a:hover, .share button:hover { transform: translateY(-2px); border-color: var(--brass); }
    .share mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .fb { font-weight: 800; font-family: Georgia, serif; font-size: 1.2rem; }

    .body { font-size: 1.14rem; line-height: 1.8; }
    .body > p { max-width: none; }
    .body p.first::first-letter { float: left; font-family: var(--serif); font-size: 4.2em; line-height: .85; padding: 6px 12px 0 0; color: var(--brass); }
    .body h2 { font-size: clamp(1.6rem, 2.6vw, 2rem); margin: 1.8em 0 .6em; scroll-margin-top: calc(var(--header-h) + 24px); }
    .body h2::before { content: ''; display: block; width: 48px; height: 3px; background: var(--brass-light); margin-bottom: 16px; border-radius: 2px; }
    .body ul { list-style: none; padding: 0; margin: 0 0 1.4em; }
    .body ul li { position: relative; padding: 10px 0 10px 34px; border-bottom: 1px solid var(--line); }
    .body ul li::before { content: ''; position: absolute; left: 6px; top: 22px; width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #7fe0d8, #00a6a6 60%, #007f86); }
    .tip { display: flex; gap: 14px; margin: 32px 0; padding: 20px 22px; border-radius: var(--r-md); background: #fff4d1; border-left: 4px solid var(--sun-deep); }
    .tip mat-icon { color: #9a6a00; flex: none; }
    .tip strong { display: block; color: #7a5300; }
    .tip p { margin: 4px 0 0; font-size: 1.02rem; }

    .book-cta { margin-top: 64px; display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: center; padding: 18px; border-radius: var(--r-lg); background: #fff; border: 1px solid var(--line); box-shadow: 0 30px 60px -40px rgba(6,50,61,.35); }
    .cta-img { aspect-ratio: 4 / 3; border-radius: var(--r-md); }
    .book-cta h2 { margin: 0 0 6px; font-size: 1.6rem; }
    .book-cta h2::before { display: none; }
    .book-cta p { font-size: 1rem; color: var(--muted); margin: 0 0 14px; }
    .cta-btns { display: flex; gap: 10px; flex-wrap: wrap; }

    .more-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 28px; }
    .more-head a { font-weight: 700; color: var(--ink); }
    .more-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
    .more-card { text-decoration: none; color: inherit; }
    .more-img { aspect-ratio: 3 / 2; border-radius: var(--r-lg); overflow: hidden; margin-bottom: 14px; }
    .more-img kb-photo { height: 100%; }
    .more-img ::ng-deep img { transition: transform .7s cubic-bezier(.2,.7,.2,1); }
    .more-card:hover .more-img ::ng-deep img { transform: scale(1.06); }
    .more-tag { font-size: .8rem; font-weight: 800; color: var(--brass); }
    .more-card h3 { margin: 6px 0; font-size: 1.25rem; }
    .more-meta { font-size: .88rem; color: var(--muted); }

    @media (max-width: 960px) {
      .layout { grid-template-columns: minmax(0, 1fr); }
      .rail { position: static; order: 2; }
      .toc { display: none; } .rail .rail-title:first-child { display: none; }
      .more-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 600px) {
      .body { font-size: 1.06rem; }
      .book-cta { grid-template-columns: 1fr; }
      .more-grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .hero-img ::ng-deep img, .hero h1, .dek, .byline { animation: none; } .hero-img { transform: none !important; } }
  `,
})
export class BlogPost implements OnDestroy {
  readonly slug = input.required<string>();
  private seo = inject(Seo);
  private fleet = inject(Fleet);
  private store = inject(ContentStore);
  protected readonly post = computed(() => this.store.blog().find((p) => p.slug === this.slug()));
  protected readonly blocks = computed<Block[]>(() =>
    (this.post()?.body ?? []).map((b) => (b.h ? { ...b, id: slugify(b.h) } : b)),
  );
  protected readonly toc = computed(() => this.blocks().filter((b) => b.h).map((b) => ({ id: b.id!, h: b.h! })));
  protected readonly firstP = computed(() => this.blocks().findIndex((b) => b.p));
  protected readonly others = computed(() => {
    const p = this.post();
    const rest = this.store.blog().filter((o) => o.slug !== p?.slug);
    return [...rest.filter((o) => o.tag === p?.tag), ...rest.filter((o) => o.tag !== p?.tag)].slice(0, 3);
  });
  protected readonly car = computed(() => this.fleet.featured()[0] ?? this.fleet.cars()[0]);
  protected readonly cheapest = computed(() => this.fleet.cheapest());
  protected readonly progress = signal(0);
  protected readonly parallax = signal(0);
  protected readonly active = signal('');
  protected readonly copied = signal(false);
  private url = computed(() => `${BUSINESS.siteUrl}/blog/${this.slug()}`);
  protected readonly shareWa = computed(() => `https://wa.me/?text=${encodeURIComponent((this.post()?.title ?? '') + ' ' + this.url())}`);
  protected readonly shareFb = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url())}`);
  private off?: () => void;

  constructor() {
    effect(() => {
      const p = this.post();
      if (!p) { this.seo.set({ title: tx('Story not found'), description: tx('This story does not exist.'), path: '/blog', noindex: true }); return; }
      this.seo.set({ title: p.title, description: p.excerpt, path: `/blog/${p.slug}`, image: p.cover.src, type: 'article', published: p.date });
      this.seo.breadcrumbs([{ name: tx('Home'), path: '/' }, { name: tx('Blog'), path: '/blog' }, { name: p.title, path: `/blog/${p.slug}` }]);
      this.seo.jsonLd('ld-post', {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt,
        image: this.seo.absolute(p.cover.src), datePublished: p.date, dateModified: p.date, inLanguage: 'en',
        author: { '@type': 'Organization', name: BUSINESS.name, url: BUSINESS.siteUrl },
        publisher: { '@type': 'Organization', name: BUSINESS.name, logo: { '@type': 'ImageObject', url: `${BUSINESS.siteUrl}/logo-badge.png` } },
        mainEntityOfPage: `${BUSINESS.siteUrl}/blog/${p.slug}`,
      });
    });
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      afterNextRender(() => {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let raf = 0;
        const on = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const h = document.documentElement.scrollHeight - innerHeight;
            this.progress.set(h > 0 ? Math.min(scrollY / h, 1) : 0);
            if (!reduce) this.parallax.set(Math.min(scrollY * 0.25, 160));
            let cur = '';
            for (const t of this.toc()) {
              const el = document.getElementById(t.id);
              if (el && el.getBoundingClientRect().top < innerHeight * 0.3) cur = t.id;
            }
            this.active.set(cur);
          });
        };
        addEventListener('scroll', on, { passive: true });
        on();
        this.off = () => { removeEventListener('scroll', on); cancelAnimationFrame(raf); };
      });
    }
  }

  protected go(e: Event, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  protected async copy() {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  ngOnDestroy() { this.off?.(); }
}
