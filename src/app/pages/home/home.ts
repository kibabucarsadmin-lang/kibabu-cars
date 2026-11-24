import { tx } from '../../../shared/i18n';
import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BUSINESS, PHOTOS, RULES, whatsappLink } from '../../../shared/business';
import { Fleet } from '../../core/fleet';
import { Seo } from '../../core/seo';
import { CarCard } from '../../shared/car-card';
import { Photo } from '../../shared/photo';
import { QuickSearch } from '../../shared/quick-search';
import { Estimator } from '../../shared/estimator';
import { IslandMap } from '../../shared/island-map';
import { Reveal } from '../../shared/reveal';
import { Waves } from '../../shared/waves';
import { I18n, TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-home',
  imports: [TPipe, MatIconModule, DecimalPipe, RouterLink, MatButtonModule, CarCard, Photo, QuickSearch, Estimator, IslandMap, Reveal, Waves],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly fleet = inject(Fleet);
  protected readonly b = BUSINESS;
  protected readonly rules = RULES;
  protected readonly photos = PHOTOS;
  protected readonly wa = whatsappLink('Hello Kibabu Cars, I would like to rent a car in Zanzibar.');
  protected readonly since = new Date().getFullYear() - BUSINESS.stats.years;

  /** Aerial-style flyover of the photos, used until a drone video is set in Admin → Settings. */
  protected readonly flyover = ['photos/seafront.jpg', 'photos/hero.jpg', 'photos/stone-town.jpg', 'photos/arrive.jpg'];
  protected readonly videoFailed = signal(false);
  protected readonly playing = signal(false);
  /** The video only loads in the browser, on screens wide enough to show it, and never on data saver or reduced motion. */
  private readonly allowVideo = (() => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    return !reduce && !save && matchMedia('(min-width: 700px)').matches;
  })();
  protected readonly videoOn = computed(() => !!this.b.heroVideo && !this.videoFailed() && this.allowVideo);
  protected readonly noop = () => {};

  /** headline split into words so they can rise in one after another */
  protected readonly headline = inject(I18n).t('Your car is waiting at the airport.');
  protected readonly headlineWords = this.headline.split(' ');

  /** scroll-driven motion: the little car on the steps road, and slow parallax on the photos */
  private readonly road = viewChild<ElementRef<HTMLElement>>('road');
  private readonly ocean = viewChild<ElementRef<HTMLElement>>('ocean');
  protected readonly roadP = signal(0);
  protected readonly shift = signal('0px');
  protected readonly oceanShift = signal('0px');

  protected readonly included = [
    { i: 'verified_user', t: tx('Basic insurance'), d: tx('Included in every rental. What it covers is in our terms.') },
    { i: 'all_inclusive', t: tx('Unlimited kilometres'), d: tx('Nungwi to Jambiani and back as many times as you like.') },
    { i: 'flight_land', t: tx('Airport and Stone Town delivery'), d: tx('Free, at any hour. Coastal hotels are $20.') },
    { i: 'support_agent', t: tx('24/7 customer support'), d: tx('Call or WhatsApp us any time, day or night.') },
    { i: 'receipt_long', t: tx('No hidden fees'), d: tx('The price you see is the price you pay.') },
    { i: 'event_available', t: tx('Free cancellation'), d: tx('Cancel for free any time before pickup.') },
  ];

  protected readonly steps = [
    { t: tx('Book online or on WhatsApp'), d: tx('Pick your dates and car. Your booking is confirmed instantly if the car is free.') },
    { t: tx('Send three documents'), d: tx('Your driving licence, a passport copy and a passport photo. We arrange the Zanzibar driving permit ({fee} per driver) before you land.'), p: { fee: '$' + RULES.permitFeePerDriver } },
    { t: tx('Collect at arrivals'), d: tx('We meet you outside the terminal with the car, the permit and the paperwork. Sign, and drive.') },
  ];


  constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);
    if (browser) afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.roadP.set(1); return; }
      let queued = false;
      const update = () => {
        queued = false;
        const vh = innerHeight;
        const road = this.road()?.nativeElement;
        if (road) {
          const r = road.getBoundingClientRect();
          // the road runs from the centre of step 1 to the centre of the last step
          const ns = road.querySelectorAll<HTMLElement>('.n');
          if (ns.length) {
            const a = ns[0].getBoundingClientRect(), z = ns[ns.length - 1].getBoundingClientRect();
            road.style.setProperty('--a', Math.round(a.top + a.height / 2 - r.top) + 'px');
            road.style.setProperty('--h', Math.round(z.top - a.top) + 'px');
          }
          // 0 when the road's top reaches 75% of the screen, 1 when its bottom reaches 55%
          const p = (vh * 0.75 - r.top) / (r.height + vh * 0.2);
          this.roadP.set(Math.round(Math.min(1, Math.max(0, p)) * 1000) / 1000);
          const c = (r.top + r.height / 2 - vh / 2) / vh;
          this.shift.set(Math.round(c * -40) + 'px');
        }
        const ocean = this.ocean()?.nativeElement;
        if (ocean) {
          const r = ocean.getBoundingClientRect();
          if (r.bottom > 0 && r.top < vh) this.oceanShift.set(Math.round(((r.top + r.height / 2 - vh / 2) / vh) * -70) + 'px');
        }
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
      update();
      destroyRef.onDestroy(() => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); });
    });
    inject(Seo).set({
      title: tx('Kibabu Cars Zanzibar | Car Rental from $25/day – Free Airport Delivery'),
      description:
        tx('Self-drive car hire in Zanzibar from $25/day. Basic insurance, unlimited km and free airport and Stone Town delivery included. No hidden fees, free cancellation. Book online or on WhatsApp.'),
      path: '/',
    });
  }
}
