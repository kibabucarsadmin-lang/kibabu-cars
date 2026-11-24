import { UsdPipe } from './usd.pipe';
import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { RouterLink } from '@angular/router';
import { RULES } from '../../shared/business';
import { calculateQuote } from '../../shared/pricing';
import { Fleet } from '../core/fleet';
import { addDays, toDateParam } from './dates';
import { Photo } from './photo';
import { TPipe } from '../core/i18n';

/** "What will my trip cost?" – pick a car and drag the days; the total counts up live. */
@Component({
  selector: 'kb-estimator',
  imports: [TPipe, UsdPipe, MatButtonModule, MatSliderModule, RouterLink, Photo],
  template: `
    <div class="est">
      <div class="left">
        <p class="q">{{ 'Your car' | t }}</p>
        <div class="cars" role="radiogroup" [attr.aria-label]="'Choose a car' | t">
          @for (c of fleet.cars(); track c.id) {
            <button type="button" role="radio" [attr.aria-checked]="carId() === c.id" [class.on]="carId() === c.id" (click)="carId.set(c.id)">
              {{ c.name.replace('Toyota ', '').replace('Nissan ', '').replace('Suzuki ', '') }}
            </button>
          }
        </div>
        <p class="q">{{ 'How many days?' | t }} <strong>{{ days() }}</strong></p>
        <mat-slider min="2" max="21" step="1" discrete class="slider">
          <input matSliderThumb [value]="days()" (valueChange)="days.set($event)" [attr.aria-label]="'Number of days' | t" />
        </mat-slider>
        <div class="road" aria-hidden="true">
          <div class="track"></div>
          <svg class="mini" [style.left.%]="(days() - 2) / 19 * 100" viewBox="0 0 64 26">
            <path d="M0 19 L1 12 Q2 9 6 9 L16 8 L22 1 Q24 0 27 0 L48 0 Q51 0 52 2 L57 8 L62 9 Q64 10 64 13 L64 19Z" fill="currentColor" />
            <circle cx="14" cy="20" r="5" fill="#06323d" /><circle cx="51" cy="20" r="5" fill="#06323d" />
          </svg>
          <span class="flag">{{ car()?.noDiscount ? ('Fixed lowest price' | t) : ('{n}+ days: save {save}/day' | t: { n: rules.longRentalFromDays, save: '$' + rules.longRentalDiscountPerDay }) }}</span>
        </div>
      </div>
      <div class="right">
        @if (car(); as c) {
          <kb-photo class="pic" [src]="c.image" [alt]="c.name" />
          <p class="total"><span class="cur">$</span>{{ shown() }}</p>
          <p class="sub">{{ 'for {n} days at {rate} a day, with the driving permit' | t: { n: days(), rate: '$' + quote()?.dailyRate } }}
            @if (quote()?.discountPerDay) { <span class="save">-\${{ quote()?.discountPerDay }}{{ '/day long-term' | t }}</span> }
          </p>
          <p class="incl">{{ 'Insurance, unlimited km and airport delivery included. Pay {amount} now, the rest on delivery.' | t: { amount: (quote()?.deposit | usd) } }}</p>
          <a mat-flat-button class="btn-brass btn-lg" routerLink="/book" [queryParams]="params()">{{ 'Book these dates' | t }}</a>
        }
      </div>
    </div>
  `,
  styles: `
    .est { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(24px, 5vw, 64px); align-items: center; }
    .q { font-weight: 700; margin: 0 0 10px; }
    .q strong { font-family: var(--serif); font-size: 1.5rem; font-weight: 450; color: var(--brass); margin-left: 6px; }
    .cars { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
    .cars button {
      font: inherit; font-weight: 600; font-size: .92rem; padding: 10px 14px; min-height: 44px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--line); background: #fff; color: var(--ink); transition: background .2s, color .2s, transform .15s;
    }
    .cars button:hover { transform: translateY(-1px); border-color: #b9b5ab; }
    .cars button.on { background: var(--mangrove); color: #fff; border-color: var(--mangrove); }
    .slider { width: 100%; margin: 0; --mat-slider-active-track-color: var(--brass); --mat-slider-handle-color: var(--brass); --mat-slider-focus-handle-color: var(--brass); --mat-slider-hover-handle-color: var(--brass); --mat-slider-inactive-track-color: var(--line); --mat-slider-with-tick-marks-active-container-color: #fff; }
    .road { position: relative; height: 52px; margin: 6px 8px 0; color: var(--mangrove); }
    .track { position: absolute; left: 0; right: 0; top: 30px; height: 2px; background: repeating-linear-gradient(90deg, var(--line) 0 14px, transparent 14px 24px); }
    .mini { position: absolute; top: 6px; width: 54px; transform: translateX(-50%); transition: left .35s cubic-bezier(.2,.7,.2,1); }
    .flag { position: absolute; right: 0; top: 36px; font-size: .8rem; color: var(--muted); }
    .right { background: var(--paper); border-radius: var(--r-md); padding: 18px 18px 22px; border: 1px solid var(--line); }
    .pic { aspect-ratio: 3 / 2; border-radius: 8px; margin-bottom: 14px; }
    .total { font-family: var(--serif); font-size: clamp(3rem, 7vw, 4.4rem); line-height: 1; margin: 0; font-variant-numeric: tabular-nums; }
    .cur { font-size: .5em; vertical-align: .7em; margin-right: 2px; color: var(--muted); }
    .sub { color: var(--muted); margin: 6px 0 4px; }
    .save { display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 4px; background: #dcebe2; color: #1e5a3a; font-size: .8rem; font-weight: 700; }
    .incl { font-size: .9rem; color: var(--muted); margin-bottom: 16px; }
    .right a { width: 100%; }
    @media (max-width: 860px) { .est { grid-template-columns: 1fr; } }
  `,
})
export class Estimator {
  protected readonly fleet = inject(Fleet);
  protected readonly rules = RULES;
  protected readonly carId = signal('rav4-5-door');
  protected readonly days = signal(5);
  protected readonly car = computed(() => this.fleet.byId(this.carId()) ?? this.fleet.cars()[0]);
  protected readonly quote = computed(() => {
    const c = this.car();
    if (!c) return null;
    const start = addDays(new Date(), 14);
    start.setHours(10, 0, 0, 0);
    const end = addDays(start, this.days());
    return calculateQuote(c, { pickupAt: start, returnAt: end, pickupLocation: 'airport', returnLocation: 'airport', drivers: 1, babySeats: 0 });
  });
  protected readonly params = computed(() => {
    const start = addDays(new Date(), 14);
    return { car: this.carId(), from: toDateParam(start), to: toDateParam(addDays(start, this.days())) };
  });

  /** Animated count-up of the total. */
  protected readonly shown = signal(0);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect((onCleanup) => {
      const target = this.quote()?.total ?? 0;
      if (!this.browser || matchMedia('(prefers-reduced-motion: reduce)').matches) { this.shown.set(target); return; }
      const from = this.shown();
      const t0 = performance.now();
      let raf = 0;
      const step = (t: number) => {
        const k = Math.min((t - t0) / 450, 1);
        const e = 1 - Math.pow(1 - k, 3);
        this.shown.set(Math.round(from + (target - from) * e));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(raf));
    });
  }
}
