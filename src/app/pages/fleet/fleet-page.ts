import { tx } from '../../../shared/i18n';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CATEGORY_LABELS, sortFleet } from '../../../shared/business';
import { CarCategory } from '../../../shared/models';
import { Fleet } from '../../core/fleet';
import { Seo } from '../../core/seo';
import { CarCard } from '../../shared/car-card';
import { Reveal } from '../../shared/reveal';
import { TPipe } from '../../core/i18n';

type Filter = CarCategory | 'all' | 'seven';

@Component({
  selector: 'kb-fleet-page',
  imports: [TPipe, CarCard, Reveal],
  template: `
    <section class="page-hero">
      <div class="wrap">
        <h1>{{ 'Cars and prices' | t }}</h1>
        <p>{{ 'Daily rates include insurance, unlimited kilometres and free delivery to the airport or Stone Town. Book 7 days or more and save $5 a day on every car except the Juke, which is already our lowest price.' | t }}</p>
      </div>
    </section>

    <section class="band">
      <div class="wrap">
        <div class="filters" role="tablist" [attr.aria-label]="'Filter cars' | t">
          @for (f of filters; track f.id) {
            <button type="button" role="tab" [attr.aria-selected]="filter() === f.id" [class.on]="filter() === f.id" (click)="filter.set(f.id)">
              {{ f.label | t }} <span>{{ count(f.id) }}</span>
            </button>
          }
        </div>
        <div class="grid-cars">
          @for (car of list(); track car.id; let n = $index) { <kb-car-card [car]="car" kbReveal="drive" [delay]="(n % 3) * 110" /> }
        </div>

        <aside class="help">
          <h2>{{ 'Not sure which one?' | t }}</h2>
          <p>{{ 'Two people travelling light are happy in the Juke or the RAV4 3-door. A family of four with suitcases wants the RAV4 5-door or the Vanguard. Six or seven people: the Alphard, or the Prado if you want 4x4.' | t }}</p>
        </aside>
      </div>
    </section>
  `,
  styles: `
    .filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 40px; border-bottom: 1px solid var(--line); }
    .filters button {
      font: inherit; font-weight: 600; color: var(--muted); background: none; border: 0; cursor: pointer;
      padding: 12px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; min-height: 44px;
    }
    .filters button span { font-weight: 500; color: #9aa09b; margin-left: 4px; }
    .filters button.on { color: var(--ink); border-color: var(--brass); }
    .grid-cars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px 28px; }
    .help { margin-top: 72px; padding-top: 32px; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr 2fr; gap: 32px; }
    .help h2 { font-size: 1.6rem; }
    .help p { color: var(--muted); font-size: 1.05rem; }
    @media (max-width: 960px) { .grid-cars { grid-template-columns: repeat(2, 1fr); } .help { grid-template-columns: 1fr; gap: 8px; } }
    @media (max-width: 600px) {
      .grid-cars { grid-template-columns: 1fr; gap: 36px; }
      .filters { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin: 0 calc(var(--gutter) * -1) 28px; padding: 0 var(--gutter); }
      .filters button { white-space: nowrap; }
    }
  `,
})
export class FleetPage {
  protected readonly fleet = inject(Fleet);
  /** ?type=suv etc. from the menu */
  readonly type = input<string | undefined>();
  protected readonly filter = signal<Filter>('all');
  protected readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: tx('All cars') },
    { id: 'suv', label: CATEGORY_LABELS.suv },
    { id: 'compact', label: CATEGORY_LABELS.compact },
    { id: 'family', label: CATEGORY_LABELS.family },
    { id: 'premium', label: CATEGORY_LABELS.premium },
    { id: 'seven', label: tx('7 seats') },
  ];

  private match(f: Filter) {
    return (c: { category: CarCategory; seats: number }) => f === 'all' || (f === 'seven' ? c.seats >= 7 : c.category === f);
  }
  protected count(f: Filter) { return this.fleet.cars().filter(this.match(f)).length; }
  protected readonly list = computed(() =>
    sortFleet(this.fleet.cars().filter(this.match(this.filter()))),
  );

  constructor() {
    effect(() => {
      const t = this.type();
      if (t && this.filters.some((f) => f.id === t)) this.filter.set(t as Filter);
      else if (!t) this.filter.set('all');
    });
    const seo = inject(Seo);
    seo.set({
      title: tx('Car Hire Zanzibar – RAV4, Escudo, Prado & more'),
      description:
        tx('Rent a Toyota RAV4, Suzuki Escudo, Nissan Juke, Vanguard, Harrier, Alphard or Land Cruiser Prado in Zanzibar from $25/day, with insurance and free airport delivery.'),
      path: '/fleet',
      image: 'cars/rav4-new-shape.jpg',
    });
    seo.breadcrumbs([{ name: tx('Home'), path: '/' }, { name: tx('Cars and prices'), path: '/fleet' }]);
  }
}
