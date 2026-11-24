import { tx } from '../../../shared/i18n';
import { Component, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { BUSINESS, CATEGORY_LABELS, RULES, whatsappLink } from '../../../shared/business';
import { Fleet } from '../../core/fleet';
import { Seo } from '../../core/seo';
import { Photo } from '../../shared/photo';
import { Reveal } from '../../shared/reveal';
import { NotFound } from '../not-found';
import { TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-car-detail',
  imports: [TPipe, RouterLink, MatButtonModule, Photo, NotFound, Reveal],
  template: `
    @if (car(); as c) {
      <div class="wrap top">
        <nav class="crumbs" [attr.aria-label]="'Breadcrumb' | t"><a routerLink="/fleet">{{ 'Cars and prices' | t }}</a> / <span aria-current="page">{{ c.name }}</span></nav>
        <div class="layout">
          <kb-photo class="pic arrive-car" [src]="c.image" [alt]="c.name + ' for rent in Zanzibar'" [eager]="true" />
          <aside class="box">
            <p class="kind">{{ cat[c.category] }}{{ c.fourByFour ? ', 4x4' : '' }}</p>
            <h1>{{ c.name }}</h1>
            <p class="for">{{ c.bestFor }}</p>
            <div class="price">
              <span class="amt">\${{ c.pricePerDay }}</span><span class="per">{{ 'per day' | t }}</span>
            </div>
            @if (c.noDiscount) {
              <p class="long">{{ 'Our lowest fixed price. Long-term and grace-period discounts don’t apply.' | t }}</p>
            } @else {
              <p class="long">{{ '{price} per day when you book {n} days or more.' | t: { price: '$' + (c.pricePerDay - rules.longRentalDiscountPerDay), n: rules.longRentalFromDays } }}</p>
            }
            <a mat-flat-button class="btn-brass btn-lg full-width" [routerLink]="['/book']" [queryParams]="{ car: c.id }">{{ 'Book the {car}' | t: { car: short() } }}</a>
            <a mat-stroked-button class="btn-lg full-width ask" [href]="wa()" target="_blank" rel="noopener">{{ 'Ask about dates on WhatsApp' | t }}</a>
            <ul>
              <li>{{ 'Insurance and unlimited km included' | t }}</li>
              <li>{{ 'Free delivery to the airport or Stone Town' | t }}</li>
              <li>{{ '50% deposit to book, the rest on delivery' | t }}</li>
            </ul>
          </aside>
        </div>
      </div>

      <section class="band band--paper">
        <div class="wrap detail">
          <div>
            <h2>{{ 'About this car' | t }}</h2>
            <p class="lede">{{ c.description }}</p>
            <ul class="feat">
              @for (f of c.features; track f) { <li>{{ f }}</li> }
              <li>{{ 'Free baby seat on request' | t }}</li>
            </ul>
          </div>
          <dl class="specs" kbReveal>
            <div><dt>{{ 'Seats' | t }}</dt><dd>{{ c.seats }}</dd></div>
            <div><dt>{{ 'Doors' | t }}</dt><dd>{{ c.doors }}</dd></div>
            <div><dt>{{ 'Luggage' | t }}</dt><dd>{{ '{n} suitcases' | t: { n: c.bags } }}</dd></div>
            <div><dt>{{ 'Gearbox' | t }}</dt><dd>{{ c.transmission | t }}</dd></div>
            <div><dt>{{ 'Fuel' | t }}</dt><dd>{{ c.fuel | t }}{{ ', return at the level you received it' | t }}</dd></div>
            <div><dt>{{ 'Four-wheel drive' | t }}</dt><dd>{{ (c.fourByFour ? 'Yes' : 'No') | t }}</dd></div>
            <div><dt>{{ 'Driving permit' | t }}</dt><dd>{{ '{fee} per driver, arranged by us' | t: { fee: '$' + rules.permitFeePerDriver } }}</dd></div>
            <div><dt>{{ 'Minimum rental' | t }}</dt><dd>{{ '{n} days' | t: { n: rules.minDays } }}</dd></div>
            <div><dt>{{ 'Late return' | t }}</dt><dd>{{ c.noDiscount ? ('Any extra hour counts as a day' | t) : ('Up to {h} extra hours free, 6+ hours count as a day' | t: { h: rules.graceHours }) }}</dd></div>
          </dl>
        </div>
      </section>

    } @else {
      <kb-not-found />
    }
  `,
  styles: `
    .top { padding-top: 24px; padding-bottom: clamp(48px, 7vw, 88px); }
    .crumbs { font-size: .9rem; color: var(--muted); margin-bottom: 18px; }
    .crumbs a { color: var(--muted); }
    .layout { display: grid; grid-template-columns: 7fr 4fr; gap: clamp(24px, 4vw, 56px); align-items: start; }
    .pic { aspect-ratio: 3 / 2; border-radius: var(--r-lg); }
    .arrive-car ::ng-deep img { animation: pull-in 1.1s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes pull-in { from { transform: scale(1.12) translateX(6%); filter: blur(6px); opacity: .4; } }
    .box { position: sticky; top: calc(var(--header-h) + 24px); }
    .kind { color: var(--brass); font-weight: 600; margin: 0 0 6px; }
    .box h1 { font-size: clamp(2rem, 3.6vw, 3rem); margin-bottom: 6px; }
    .for { color: var(--muted); margin: 0 0 20px; }
    .price { display: flex; align-items: baseline; gap: 8px; padding: 18px 0 4px; border-top: 1px solid var(--line); }
    .amt { font-family: var(--serif); font-size: 3rem; line-height: 1; }
    .per { color: var(--muted); }
    .long { color: var(--muted); font-size: .92rem; margin-bottom: 20px; }
    .ask { margin-top: 10px; }
    .box ul { list-style: none; padding: 0; margin: 22px 0 0; font-size: .95rem; color: var(--muted); }
    .box li { padding: 8px 0 8px 22px; border-top: 1px solid var(--line); position: relative; }
    .box li::before { content: ''; position: absolute; left: 2px; top: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--brass-light); }
    .detail { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 88px); }
    .feat { padding-left: 20px; color: var(--muted); }
    .feat li { padding: 3px 0; }
    .specs { margin: 0; }
    .specs div { display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); }
    .specs dt { font-weight: 700; }
    .specs dd { margin: 0; color: var(--muted); }
    @media (max-width: 900px) {
      .layout, .detail { grid-template-columns: 1fr; }
      .box { position: static; }
      .pic { margin: 0 calc(var(--gutter) * -1); border-radius: 0; }
    }
    @media (max-width: 600px) {
      .specs div { grid-template-columns: 1fr 1.3fr; }
    }
  `,
})
export class CarDetail {
  readonly id = input.required<string>();
  private fleet = inject(Fleet);
  private seo = inject(Seo);
  protected readonly cat = CATEGORY_LABELS;
  protected readonly rules = RULES;
  protected readonly car = computed(() => this.fleet.byId(this.id()));
  protected readonly short = computed(() => (this.car()?.name ?? '').replace(/^(Toyota|Nissan|Suzuki) /, ''));
  protected readonly wa = computed(() => whatsappLink(`Hello Kibabu Cars, is the ${this.car()?.name} free from ... to ...?`));

  constructor() {
    effect(() => {
      const c = this.car();
      if (!c) {
        this.seo.set({ title: tx('Car not found'), description: tx('This vehicle is not available.'), path: '/fleet', noindex: true });
        return;
      }
      this.seo.set({
        title: `${c.name} Rental Zanzibar – from $${c.pricePerDay}/day`,
        description: `Rent a ${c.name} in Zanzibar from $${c.pricePerDay}/day. ${c.seats} seats, ${c.transmission.toLowerCase()}${c.fourByFour ? ', 4x4' : ''}. Insurance, unlimited km and free airport delivery included.`,
        path: `/fleet/${c.id}`,
        image: c.image,
        type: 'product',
      });
      this.seo.breadcrumbs([{ name: tx('Home'), path: '/' }, { name: tx('Cars and prices'), path: '/fleet' }, { name: c.name, path: `/fleet/${c.id}` }]);
      this.seo.jsonLd('ld-car', {
        '@context': 'https://schema.org', '@type': 'Product', name: `${c.name} – car rental Zanzibar`, description: c.description,
        brand: { '@type': 'Brand', name: c.name.split(' ')[0] },
        offers: { '@type': 'Offer', price: c.pricePerDay, priceCurrency: 'USD', availability: 'https://schema.org/InStock',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: c.pricePerDay, priceCurrency: 'USD', unitText: 'DAY' },
          url: `${BUSINESS.siteUrl}/fleet/${c.id}`, seller: { '@type': 'Organization', name: BUSINESS.name } },
      });
    });
  }
}
