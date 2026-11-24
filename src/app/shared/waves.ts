import { Component, input } from '@angular/core';

/**
 * Three layers of lagoon water rolling at different speeds.
 * The front layer takes the colour of the section below, so the wave
 * becomes the edge of the next section.
 */
@Component({
  selector: 'kb-waves',
  template: `
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <g class="w w1"><path d="M0 52 Q90 26 180 52 T360 52 T540 52 T720 52 T900 52 T1080 52 T1260 52 T1440 52 T1620 52 T1800 52 T1980 52 T2160 52 T2340 52 T2520 52 T2700 52 T2880 52 V120 H0Z" fill="#9fe6df" /></g>
      <g class="w w2"><path d="M0 72 Q120 46 240 72 T480 72 T720 72 T960 72 T1200 72 T1440 72 T1680 72 T1920 72 T2160 72 T2400 72 T2640 72 T2880 72 V120 H0Z" fill="#35c3bc" /></g>
      <g class="w w3"><path d="M0 94 Q160 76 320 94 T640 94 T960 94 T1280 94 T1600 94 T1920 94 T2240 94 T2560 94 T2880 94 V120 H0Z" [attr.fill]="floor()" /></g>
    </svg>
  `,
  styles: `
    :host { position: absolute; left: 0; right: 0; bottom: -1px; height: clamp(70px, 9vw, 120px); pointer-events: none; z-index: 0; }
    svg { display: block; width: 100%; height: 100%; }
    .w { animation: roll 22s linear infinite; }
    .w2 { animation-duration: 15s; animation-direction: reverse; }
    .w3 { animation-duration: 30s; }
    @keyframes roll { to { transform: translateX(-1440px); } }
    @media (prefers-reduced-motion: reduce) { .w { animation: none; } }
  `,
})
export class Waves {
  /** colour of the section below the waves */
  readonly floor = input('var(--foam)');
}
