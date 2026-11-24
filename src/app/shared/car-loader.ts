import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The Kibabu loader: a little SUV driving along a road – wheels turn, the body bounces gently,
 * the road slides by and small speed lines trail behind. Pure SVG + CSS (no images, no JS timers).
 * Motion stops for visitors who ask for reduced motion.
 *
 * The same drawing is inlined in index.html for the very first load (before Angular starts).
 */
@Component({
  selector: 'kb-car-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size() * 0.62" viewBox="0 0 120 74" role="img" [attr.aria-label]="label()">
      <g class="speed">
        <line x1="4" y1="30" x2="20" y2="30" /><line x1="0" y1="40" x2="14" y2="40" /><line x1="8" y1="50" x2="20" y2="50" />
      </g>
      <g class="body">
        <!-- roof rack + cabin -->
        <rect x="40" y="12" width="34" height="3" rx="1.5" class="rack" />
        <path d="M34 36 L42 18 Q44 15 48 15 L74 15 Q78 15 80 18 L88 36 Z" class="cabin" />
        <path d="M45 20 L50 20 L50 34 L40 34 Z M54 20 L60 20 L60 34 L54 34 Z M64 20 L74 20 Q76 20 77 22 L82 34 L64 34 Z" class="glass" />
        <!-- body -->
        <path d="M22 38 Q22 34 27 34 L96 34 Q104 34 106 40 L108 50 Q108 54 104 54 L24 54 Q20 54 20 50 Z" class="paint" />
        <rect x="98" y="40" width="7" height="4" rx="2" class="lamp" />
        <rect x="21" y="40" width="4" height="4" rx="1.5" class="tail" />
        <line x1="58" y1="38" x2="58" y2="52" class="door" />
      </g>
      <g class="wheel" style="transform-origin: 40px 54px"><circle cx="40" cy="54" r="10" class="tyre" /><circle cx="40" cy="54" r="4.5" class="rim" /><path d="M40 45 V63 M31 54 H49" class="spoke" /></g>
      <g class="wheel" style="transform-origin: 88px 54px"><circle cx="88" cy="54" r="10" class="tyre" /><circle cx="88" cy="54" r="4.5" class="rim" /><path d="M88 45 V63 M79 54 H97" class="spoke" /></g>
      <line x1="0" y1="66" x2="120" y2="66" class="road" />
    </svg>
  `,
  styles: `
    :host { display: inline-block; line-height: 0; }
    svg { overflow: visible; }
    .paint { fill: var(--sea, #06323d); }
    .cabin { fill: var(--sea, #06323d); }
    .glass { fill: var(--shallows, #d4f4f1); }
    .rack { fill: var(--sun-deep, #f5a800); }
    .lamp { fill: var(--sun, #ffc53d); }
    .tail { fill: var(--coral, #ff7a59); }
    .door { stroke: rgba(255,255,255,.25); stroke-width: 1.2; }
    .tyre { fill: #1d2326; }
    .rim { fill: var(--shallows, #d4f4f1); }
    .spoke { stroke: #1d2326; stroke-width: 2; }
    .road { stroke: var(--sun, #ffc53d); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 12 10; animation: kb-road .5s linear infinite; }
    .speed line { stroke: var(--lagoon-2, #00a6a6); stroke-width: 3; stroke-linecap: round; animation: kb-speed .6s ease-in-out infinite; }
    .speed line:nth-child(2) { animation-delay: .15s; } .speed line:nth-child(3) { animation-delay: .3s; }
    .body { animation: kb-bounce .5s ease-in-out infinite; }
    .wheel { animation: kb-spin .5s linear infinite; }
    @keyframes kb-spin { to { transform: rotate(360deg); } }
    @keyframes kb-bounce { 50% { transform: translateY(-1.6px); } }
    @keyframes kb-road { to { stroke-dashoffset: 22; } }
    @keyframes kb-speed { 0%, 100% { opacity: 0; transform: translateX(6px); } 50% { opacity: 1; transform: translateX(0); } }
    @media (prefers-reduced-motion: reduce) { .road, .speed line, .body, .wheel { animation: none; } }
  `,
})
export class CarLoader {
  readonly size = input(120);
  readonly label = input('Loading');
}
