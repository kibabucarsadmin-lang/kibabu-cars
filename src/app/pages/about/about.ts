import { tx } from '../../../shared/i18n';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { BUSINESS, PHOTOS } from '../../../shared/business';
import { ContentStore } from '../../core/content-store';
import { Seo } from '../../core/seo';
import { Photo } from '../../shared/photo';
import { Reveal } from '../../shared/reveal';
import { CountUp } from '../../shared/count-up';
import { TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-about',
  imports: [TPipe, RouterLink, MatButtonModule, Photo, Reveal, CountUp],
  template: `
    <section class="intro">
      <kb-photo class="bg" [src]="photos.aboutTown.src" [fallbackSrc]="photos.aboutTown.fallback" [alt]="'Stone Town, Zanzibar' | t" [eager]="true" fallbackLabel=" " />
      <div class="shade"></div>
      <div class="wrap copy">
        <div class="studs in" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <h1 class="in">{{ a.heroTitle }}</h1>
      </div>
    </section>

    <section class="band band--paper">
      <div class="wrap story">
        <div kbReveal>
          <h2>{{ a.storyTitle }}</h2>
        </div>
        <div class="text">
          @for (p of a.story; track $index; let i = $index) {
            <p [class.lede]="i === 0" kbReveal [delay]="i * 100">{{ p }}</p>
          }
          <dl class="facts">
            <div kbReveal><dt><span [kbCountUp]="b.stats.years" suffix="+"></span></dt><dd>{{ 'years handing over keys' | t }}</dd></div>
            <div kbReveal [delay]="100"><dt><span [kbCountUp]="b.stats.rentals" suffix="+"></span></dt><dd>{{ 'rentals for guests from around the world' | t }}</dd></div>
            <div kbReveal [delay]="200"><dt><span [kbCountUp]="b.stats.vehicles" suffix="+"></span></dt><dd>{{ 'cars, serviced between every rental' | t }}</dd></div>
            <div kbReveal [delay]="300"><dt><span [kbCountUp]="b.tripadvisorRating" [decimals]="1"></span></dt><dd>{{ 'average rating on Tripadvisor' | t }}</dd></div>
          </dl>
          <div class="btns" kbReveal>
            <a mat-flat-button class="btn-brass btn-lg" routerLink="/fleet">{{ 'See the cars' | t }}</a>
            <a mat-stroked-button class="btn-lg" [href]="b.tripadvisor" target="_blank" rel="noopener">{{ 'Read our reviews' | t }}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="band promise">
      <div class="wrap">
        <h2 kbReveal>{{ a.valuesTitle }}</h2>
        <div class="road" aria-hidden="true"><svg class="car" viewBox="0 0 64 26"><path d="M0 19 L1 12 Q2 9 6 9 L16 8 L22 1 Q24 0 27 0 L48 0 Q51 0 52 2 L57 8 L62 9 Q64 10 64 13 L64 19Z" fill="#ffc53d"/><circle cx="14" cy="20" r="5" fill="#0f1612"/><circle cx="51" cy="20" r="5" fill="#0f1612"/></svg></div>
        <ol class="stops">
          @for (v of a.values; track v.t; let i = $index) {
            <li kbReveal [delay]="i * 140"><span class="pin"></span><h3>{{ v.t }}</h3><p>{{ v.d }}</p></li>
          }
        </ol>
      </div>
    </section>
  `,
  styles: `
    .intro { position: relative; min-height: clamp(380px, 60vh, 560px); display: flex; align-items: flex-end; isolation: isolate; color: #fff; }
    .bg { position: absolute; inset: 0; z-index: -2; }
    .shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, rgba(17,26,21,.85), rgba(17,26,21,.2) 70%); }
    .copy { padding-bottom: clamp(36px, 6vw, 64px); }
    .copy h1 { color: #fff; max-width: 15em; font-size: clamp(2.2rem, 5vw, 3.6rem); }
    .story { display: grid; grid-template-columns: 4fr 7fr; gap: clamp(24px, 6vw, 88px); }
    .text p { max-width: 60ch; }
    .facts { margin: 36px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .facts dt span { font-variant-numeric: tabular-nums; }
    .facts div { border-top: 1px solid var(--line); padding-top: 14px; }
    .facts dt { font-family: var(--serif); font-size: 1.8rem; line-height: 1.1; margin-bottom: 4px; }
    .facts dd { margin: 0; color: var(--muted); font-size: .95rem; }
    .btns { display: flex; gap: 12px; flex-wrap: wrap; }
    .in { animation: rise 1s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(24px); } }
    .bg ::ng-deep img { animation: kb 18s ease-in-out infinite alternate; }
    @keyframes kb { from { transform: scale(1); } to { transform: scale(1.08) translateX(-2%); } }
    .promise { background: var(--mangrove); color: #e9ece8; overflow: hidden; }
    .promise h2 { color: #fff; }
    .road { position: relative; height: 40px; margin: 28px 0 8px; border-bottom: 2px dashed rgba(201,164,106,.4); }
    .road .car { position: absolute; bottom: 2px; width: 56px; animation: drive 10s linear infinite; }
    @keyframes drive { from { left: -60px; } to { left: 100%; } }
    .stops { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .stops li { position: relative; padding-top: 22px; }
    .pin { position: absolute; top: -17px; left: 0; width: 14px; height: 14px; border-radius: 50%; background: var(--brass-light); box-shadow: 0 0 0 5px rgba(201,164,106,.2); }
    .stops h3 { color: #fff; font-size: 1.15rem; }
    .stops p { color: #b8d6d8; font-size: .95rem; }
    @media (max-width: 860px) { .story { grid-template-columns: 1fr; } .facts { grid-template-columns: 1fr 1fr; } .stops { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .stops { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .in, .bg ::ng-deep img, .road .car { animation: none; } }
  `,
})
export class About {
  protected readonly b = BUSINESS;
  protected readonly photos = PHOTOS;
  protected readonly a = inject(ContentStore).about();
  constructor() {
    inject(Seo).set({
      title: tx('About Kibabu Cars – Local Zanzibar Car Rental'),
      description: tx('Kibabu Cars is a locally owned car rental company in Stone Town, Zanzibar, with 50+ vehicles, 1,000+ rentals and help day and night.'),
      path: '/about',
    });
  }
}
