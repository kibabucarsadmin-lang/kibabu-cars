import { Component, input } from '@angular/core';

/**
 * Dark page header with layered, slowly rolling waves and a little car
 * driving the shoreline. Used on Blog, FAQ and About.
 */
@Component({
  selector: 'kb-page-hero',
  template: `
    <section class="ph">
      <div class="glow" aria-hidden="true"></div>
      <div class="wrap content">
        <div class="studs" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <h1 class="in">{{ title() }}</h1>
        @if (text()) { <p class="in d1">{{ text() }}</p> }
        <div class="in d2"><ng-content /></div>
      </div>
      <svg class="sea" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
        <g class="w w1"><path d="M0 70 Q90 40 180 70 T360 70 T540 70 T720 70 T900 70 T1080 70 T1260 70 T1440 70 T1620 70 T1800 70 T1980 70 T2160 70 T2340 70 T2520 70 T2700 70 T2880 70 V140 H0Z" fill="#9fe6df" /></g>
        <g class="w w2"><path d="M0 92 Q120 66 240 92 T480 92 T720 92 T960 92 T1200 92 T1440 92 T1680 92 T1920 92 T2160 92 T2400 92 T2640 92 T2880 92 V140 H0Z" fill="#35c3bc" /></g>
        <g class="w w3"><path d="M0 112 Q160 96 320 112 T640 112 T960 112 T1280 112 T1600 112 T1920 112 T2240 112 T2560 112 T2880 112 V140 H0Z" [attr.fill]="floor()" /></g>
      </svg>
      <svg class="mini-car" viewBox="0 0 64 26" aria-hidden="true">
        <path d="M0 19 L1 12 Q2 9 6 9 L16 8 L22 1 Q24 0 27 0 L48 0 Q51 0 52 2 L57 8 L62 9 Q64 10 64 13 L64 19Z" fill="#ffc53d" />
        <circle cx="14" cy="20" r="5" fill="#06323d" /><circle cx="51" cy="20" r="5" fill="#06323d" />
      </svg>
    </section>
  `,
  styles: `
    .ph { position: relative; overflow: hidden; background: linear-gradient(180deg, #dff7f4 0%, #f1fbfa 100%); color: var(--sea); padding: clamp(48px, 8vw, 96px) 0 clamp(96px, 12vw, 140px); isolation: isolate; }
    .glow { position: absolute; width: 520px; height: 520px; right: -120px; top: -220px; border-radius: 50%; z-index: -1;
      background: radial-gradient(circle, #ffd76a 0%, #ffc53d 40%, rgba(255,197,61,0) 68%); animation: pulse 8s ease-in-out infinite alternate; }
    @keyframes pulse { to { transform: translate(-30px, 24px) scale(1.06); } }
    h1 { color: var(--sea); font-size: clamp(2.3rem, 5.4vw, 3.8rem); max-width: 16em; }
    p { color: var(--muted); font-size: 1.12rem; max-width: 56ch; margin: 0; }
    .in { animation: rise .9s cubic-bezier(.2,.7,.2,1) both; }
    .d1 { animation-delay: .12s; } .d2 { animation-delay: .24s; }
    @keyframes rise { from { opacity: 0; transform: translateY(20px); } }
    .sea { position: absolute; left: 0; bottom: -1px; width: 100%; height: clamp(70px, 9vw, 120px); }
    .w { animation: roll 18s linear infinite; }
    .w2 { animation-duration: 12s; animation-direction: reverse; }
    .w3 { animation-duration: 24s; }
    @keyframes roll { to { transform: translateX(-1440px); } }
    .mini-car { position: absolute; width: 46px; bottom: clamp(26px, 3.4vw, 44px); left: 0; animation: cruise 16s linear infinite; filter: drop-shadow(0 4px 6px rgba(6,50,61,.3)); }
    @keyframes cruise { 0% { transform: translateX(-80px) translateY(0); } 25% { transform: translateX(25vw) translateY(-3px); } 50% { transform: translateX(50vw) translateY(0); } 75% { transform: translateX(75vw) translateY(-3px); } 100% { transform: translateX(105vw) translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .w, .mini-car, .glow, .in { animation: none !important; } }
  `,
})
export class PageHero {
  readonly title = input.required<string>();
  readonly text = input('');
  /** colour of the front wave = colour of the section below */
  readonly floor = input('#f3fbfa');
}
