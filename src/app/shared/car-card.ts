import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Car } from '../../shared/models';
import { Photo } from './photo';
import { TPipe } from '../core/i18n';

/** Photo-led car tile: the picture does the selling, details stay quiet. */
@Component({
  selector: 'kb-car-card',
  imports: [TPipe, RouterLink, Photo],
  template: `
    @let c = car();
    <a class="tile" [routerLink]="['/fleet', c.id]">
      <kb-photo class="pic" [src]="c.image" [alt]="c.name" />
      <div class="meta">
        <div>
          <h3>{{ c.name }}</h3>
          <p>{{ '{seats} seats, {bags} bags' | t: { seats: c.seats, bags: c.bags } }}{{ c.fourByFour ? ', 4x4' : '' }}</p>
        </div>
        <p class="price"><span>{{ 'from' | t }}</span> \${{ c.pricePerDay }}<span>{{ '/day' | t }}</span></p>
      </div>
      <p class="for">{{ c.bestFor }}</p>
    </a>
  `,
  styles: `
    :host { display: block; }
    .tile { position: relative; display: flex; flex-direction: column; height: 100%; padding: 10px 10px 18px; border-radius: 28px; background: #fff;
      box-shadow: 0 0 0 1px var(--line); color: inherit; text-decoration: none; transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s; }
    .tile:hover { transform: translateY(-6px); box-shadow: 0 0 0 1px var(--line), var(--lift); }
    .pic { aspect-ratio: 3 / 2; border-radius: 20px; }
    .pic ::ng-deep img { transition: transform .6s cubic-bezier(.2,.7,.2,1); }
    .tile:hover .pic ::ng-deep img { transform: scale(1.05); }
    .meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin: 16px 8px 0; }
    h3 { margin: 0; font-size: 1.3rem; }
    .meta p { margin: 4px 0 0; color: var(--muted); font-size: .92rem; }
    .price { position: absolute; top: 22px; right: 22px; margin: 0 !important; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.94); backdrop-filter: blur(6px); box-shadow: 0 4px 14px -6px rgba(6,50,61,.4);
      font-family: var(--serif); font-weight: 800; font-size: 1.15rem !important; color: var(--sea) !important; white-space: nowrap;
      box-shadow: 0 8px 18px -10px rgba(6,50,61,.6); }
    .price span { font-family: var(--sans); font-weight: 700; font-size: .78rem; }
    .price span:first-child { margin-right: 3px; }
    .for { margin: 12px 8px 0; padding: 0; font-size: .9rem; color: var(--lagoon); font-weight: 700; }
  `,
})
export class CarCard {
  readonly car = input.required<Car>();
}
