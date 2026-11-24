import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { EXTRAS, INSURANCE } from '../../shared/business';
import { Booking } from '../../shared/models';
import { UsdPipe } from './usd.pipe';
import { I18n, TPipe } from '../core/i18n';

/** Everything the guest chose, with the full price breakdown. */
@Component({
  selector: 'kb-booking-receipt',
  imports: [TPipe, MatIconModule, UsdPipe],
  template: `
    @let b = booking();
    <section class="receipt" [attr.aria-label]="'Your extras and price' | t">
      <h3>{{ 'Your extras and services' | t }}</h3>
      <ul class="chosen">
        @for (x of chosen(); track x.label) {
          <li [class.req]="x.required">
            <mat-icon aria-hidden="true">{{ x.icon }}</mat-icon>
            <span><strong>{{ x.label }}</strong>@if (x.note) {<small>{{ x.note }}</small>}</span>
          </li>
        }
      </ul>
      @if (!hasOptional()) { <p class="none">{{ 'No optional extras added. Ask us on WhatsApp if you change your mind.' | t }}</p> }

      <h3>{{ 'Price breakdown' | t }}</h3>
      <dl class="lines">
        @for (l of b.quote.lines; track $index) {
          <div [class.minus]="l.amount < 0"><dt>{{ l.t ? (l.t | t: l.p) : l.label }}</dt><dd>{{ l.amount < 0 ? '−' : '' }}{{ abs(l.amount) | usd }}</dd></div>
        }
        <div class="total"><dt>{{ 'Total' | t }}</dt><dd>{{ b.quote.total | usd }}</dd></div>
      </dl>
      <div class="split">
        <div class="now"><small>{{ (b.paymentMethod === 'online' ? 'Pay now' : 'Pay at pickup') | t }}</small><strong>{{ b.quote.total | usd }}</strong></div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .receipt { margin: 28px 0; padding: clamp(18px, 3vw, 28px); border-radius: 22px; background: var(--foam); box-shadow: 0 0 0 1px var(--line); }
    h3 { font-size: 1.15rem; margin: 0 0 12px; }
    h3:not(:first-child) { margin-top: 24px; }
    .chosen { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 10px; }
    .chosen li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: #fff; box-shadow: 0 0 0 1px var(--line); }
    .chosen mat-icon { flex: none; display: grid; place-items: center; width: 38px; height: 38px; font-size: 20px; border-radius: 12px; background: var(--shallows); color: var(--lagoon); }
    .chosen li.req mat-icon { background: #fff1c9; color: #9a6a00; }
    .chosen span { display: flex; flex-direction: column; line-height: 1.3; }
    .chosen strong { font-size: .95rem; }
    .chosen small { color: var(--muted); font-size: .82rem; }
    .none { margin: 10px 0 0; color: var(--muted); font-size: .9rem; }
    .lines { margin: 0; }
    .lines div { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px dashed var(--line); font-size: .95rem; }
    .lines dt { color: var(--muted); }
    .lines dd { margin: 0; font-weight: 700; white-space: nowrap; }
    .lines .minus dd { color: var(--lagoon); }
    .lines .total { border-bottom: 0; padding-top: 14px; font-size: 1.1rem; }
    .lines .total dt { color: var(--ink); font-weight: 800; }
    .lines .total dd { font-family: var(--serif); font-size: 1.5rem; font-weight: 800; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
    .split div { display: flex; flex-direction: column; padding: 12px 14px; border-radius: 16px; background: #fff; box-shadow: 0 0 0 1px var(--line); }
    .split .now { background: var(--sun); box-shadow: none; }
    .split small { font-size: .8rem; font-weight: 700; color: var(--muted); }
    .split .now small { color: var(--sea); }
    .split strong { font-family: var(--serif); font-size: 1.35rem; font-weight: 800; color: var(--sea); }
  `,
})
export class BookingReceipt {
  private i18n = inject(I18n);
  readonly booking = input.required<Booking>();
  protected readonly abs = Math.abs;

  private readonly icons: Record<string, string> = { permit: 'badge', cooler: 'kitchen', chauffeur: 'person_pin', sim: 'sim_card' };

  protected readonly chosen = computed(() => {
    const b = this.booking();
    const t = (s: string, p?: Record<string, string | number>) => this.i18n.t(s, p);
    const days = b.quote.days;
    const out: { label: string; note?: string; icon: string; required?: boolean }[] = [];
    const ids = new Set(b.extras ?? []);
    const charged = new Set(b.quote.lines.map((l) => l.t ?? l.label));
    for (const x of EXTRAS) {
      // chosen by the guest, or a required extra that was charged on this booking
      if (!ids.has(x.id) && !(x.locked && charged.has(x.label))) continue;
      out.push({ label: t(x.label), note: x.locked ? t('Required · {price}', { price: '$' + x.price }) : x.per === 'day' ? t('{price} per day', { price: '$' + x.price }) : '$' + x.price, icon: x.icon ?? this.icons[x.id] ?? 'add_circle', required: x.locked });
    }
    const ins = INSURANCE.find((i) => i.id === b.insurance);
    if (ins) out.push({ label: t(ins.label), note: t('{price} × {n} days', { price: '$' + ins.pricePerDay, n: days }), icon: 'shield' });
    if (b.drivers > 1) out.push({ label: t('Additional drivers: {n}', { n: b.drivers - 1 }), note: t('{n} drivers in total', { n: b.drivers }), icon: 'group' });
    if (b.babySeats > 0) out.push({ label: t('Baby seats: {n}', { n: b.babySeats }), note: t('Free'), icon: 'child_care' });
    return out;
  });

  protected readonly hasOptional = computed(() => this.chosen().some((x) => !x.required));
}
