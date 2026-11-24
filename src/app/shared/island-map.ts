import { tx } from '../../shared/i18n';
import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, PLATFORM_ID, afterRenderEffect, computed, inject, signal } from '@angular/core';
import { TPipe } from '../core/i18n';

interface Place { id: string; name: string; time: string; note: string; x: number; y: number; route: string; }

const ISLAND =
  'M212 34 C208.0 37.0 203.7 51.7 200 62 C196.3 72.3 193.7 83.0 190 96 C186.3 109.0 182.0 125.0 178 140 C174.0 155.0 169.7 170.7 166 186 C162.3 201.3 159.3 218.3 156 232 C152.7 245.7 149.0 258.0 146 268 C143.0 278.0 137.7 284.0 138 292 C138.3 300.0 145.0 306.3 148 316 C151.0 325.7 153.7 337.3 156 350 C158.3 362.7 159.3 377.7 162 392 C164.7 406.3 168.0 421.7 172 436 C176.0 450.3 181.3 464.0 186 478 C190.7 492.0 195.3 507.0 200 520 C204.7 533.0 208.7 551.3 214 556 C219.3 560.7 226.3 554.7 232 548 C237.7 541.3 243.0 527.7 248 516 C253.0 504.3 257.3 490.3 262 478 C266.7 465.7 271.7 454.7 276 442 C280.3 429.3 286.7 414.7 288 402 C289.3 389.3 288.3 375.7 284 366 C279.7 356.3 267.7 351.3 262 344 C256.3 336.7 250.0 330.0 250 322 C250.0 314.0 258.3 306.7 262 296 C265.7 285.3 270.7 271.7 272 258 C273.3 244.3 271.7 229.3 270 214 C268.3 198.7 265.3 182.0 262 166 C258.7 150.0 254.3 133.3 250 118 C245.7 102.7 240.3 86.3 236 74 C231.7 61.7 228.0 50.7 224 44 C220.0 37.3 216.0 31.0 212 34Z';

const START = { x: 150, y: 296 }; // Stone Town

/** Stylised map of Unguja: tap a place and a car drives the route from Stone Town. */
@Component({
  imports: [TPipe],
  selector: 'kb-island-map',
  template: `
    <div class="wrapper">
      <div class="map">
        <svg viewBox="90 10 260 570" role="img" [attr.aria-label]="'Map of Zanzibar showing driving times from Stone Town' | t">
          <defs>
            <pattern id="im-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#8fdcd4" /></pattern>
          </defs>
          <rect x="90" y="10" width="260" height="570" fill="url(#im-dots)" opacity=".6" />
          <path [attr.d]="island" fill="#ffffff" stroke="#bfe0dc" stroke-width="1.5" />
          <!-- roads -->
          @for (p of places; track p.id) {
            <path [attr.d]="p.route" fill="none" stroke="#cfe3e1" stroke-width="2" />
          }
          @if (current(); as p) {
            @for (k of [p.id]; track k) {
              <path [attr.d]="p.route" id="im-route" class="route" fill="none" stroke="#007f86" stroke-width="3.5" stroke-linecap="round" pathLength="1" />
              <g class="mover">
                <circle r="9" fill="#06323d" />
                <circle r="3.5" fill="#00a6a6" />
                <animateMotion begin="indefinite" dur="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1">
                  <mpath href="#im-route" />
                </animateMotion>
              </g>
            }
          }
          <g class="start">
            <circle [attr.cx]="start.x" [attr.cy]="start.y" r="7" fill="#06323d" />
            <text [attr.x]="start.x - 12" [attr.y]="start.y + 4" text-anchor="end">{{ 'Stone Town' | t }}</text>
          </g>
          @for (p of places; track p.id) {
            <g class="pin" [class.on]="sel() === p.id" (click)="sel.set(p.id)" tabindex="-1">
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="12" fill="transparent" />
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5.5" class="dot" />
              <text [attr.x]="p.x + 11" [attr.y]="p.y + 4">{{ p.name }}</text>
            </g>
          }
          <text x="96" y="572" class="note">{{ 'Unguja island, not to scale' | t }}</text>
        </svg>
      </div>
      <div class="side">
        <ul role="listbox" [attr.aria-label]="'Destinations' | t">
          @for (p of places; track p.id) {
            <li>
              <button type="button" role="option" [attr.aria-selected]="sel() === p.id" [class.on]="sel() === p.id" (click)="sel.set(p.id)">
                <span class="name">{{ p.name }}</span>
                <span class="time">{{ p.time }}</span>
                <span class="note2">{{ p.note | t }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
  styles: `
    .wrapper { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: clamp(20px, 4vw, 48px); align-items: center; }
    .map { background: linear-gradient(160deg, #d9f2ef, #b5e3dd); border-radius: var(--r-lg); padding: 10px; }
    svg { width: 100%; height: auto; max-height: 560px; display: block; font-family: var(--sans); }
    text { font-size: 11px; font-weight: 700; fill: #3c4540; }
    .note { font-size: 9px; font-weight: 500; fill: #7d877f; }
    .start text { fill: #06323d; }
    .pin { cursor: pointer; }
    .pin .dot { fill: #fff; stroke: #007f86; stroke-width: 2.5; transition: r .2s; }
    .pin.on .dot { fill: #007f86; r: 7; }
    .pin.on text { fill: #007f86; }
    .route { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.8s cubic-bezier(.45,0,.2,1) forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
    li button {
      width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; text-align: left; padding: 16px 12px;
      border: 0; border-bottom: 1px solid var(--line); background: none; font: inherit; color: inherit; cursor: pointer;
      transition: background .2s;
    }
    li button:hover { background: rgba(255,255,255,.6); }
    li button.on { background: #fff; border-radius: 14px; box-shadow: inset 4px 0 0 var(--lagoon); }
    .name { font-weight: 700; }
    .time { font-family: var(--serif); font-size: 1.2rem; color: var(--brass); grid-row: span 2; align-self: center; white-space: nowrap; }
    .note2 { color: var(--muted); font-size: .92rem; }
    @media (max-width: 760px) {
      .wrapper { grid-template-columns: 1fr; }
      svg { max-height: 420px; }
    }
    @media (prefers-reduced-motion: reduce) { .route { animation: none; stroke-dashoffset: 0; } }
  `,
})
export class IslandMap {
  protected readonly island = ISLAND;
  protected readonly start = START;
  protected readonly places: Place[] = [
    { id: 'airport', name: 'Airport', time: '15 min', note: tx('Where most guests collect their car'), x: 168, y: 326, route: 'M150 296 Q160 312 168 326' },
    { id: 'jozani', name: 'Jozani Forest', time: '45 min', note: tx('Red colobus monkeys and a mangrove boardwalk'), x: 222, y: 392, route: 'M150 296 Q180 330 200 360 T222 392' },
    { id: 'paje', name: 'Paje', time: '1 h', note: tx('Kitesurf lagoon, beach cafés'), x: 280, y: 404, route: 'M150 296 Q180 330 200 360 Q240 384 280 404' },
    { id: 'jambiani', name: 'Jambiani', time: '1 h 10', note: tx('Quiet village beach, seaweed farms'), x: 266, y: 452, route: 'M150 296 Q180 330 200 360 Q240 384 278 408 Q276 432 266 452' },
    { id: 'matemwe', name: 'Matemwe', time: '1 h', note: tx('Mnemba atoll snorkelling trips'), x: 262, y: 196, route: 'M150 296 Q190 270 220 240 Q244 214 262 196' },
    { id: 'nungwi', name: 'Nungwi & Kendwa', time: '1 h 15', note: tx('Northern beaches and sunset dhows'), x: 212, y: 52, route: 'M150 296 Q168 240 180 190 Q196 120 212 52' },
  ];
  protected readonly sel = signal('paje');
  protected readonly current = computed(() => this.places.find((p) => p.id === this.sel()));

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    // restart the car each time a new place is chosen
    afterRenderEffect(() => {
      this.sel();
      if (!browser) return;
      const anim = host.querySelector('animateMotion') as (SVGElement & { beginElement?: () => void }) | null;
      anim?.beginElement?.();
    });
  }
}
