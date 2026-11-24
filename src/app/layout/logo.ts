import { Component, input } from '@angular/core';

/**
 * Round logo badge (car mark from the Kibabu logo) with a slowly turning
 * brass-and-green ring, plus the KIBABU CARS wordmark in the brand style.
 */
@Component({
  selector: 'kb-logo',
  template: `
    <span class="badge" [style.width.px]="size()" [style.height.px]="size()">
      <span class="ring"></span>
      <img src="logo-badge.png" alt="" width="128" height="128" />
    </span>
    @if (!compact()) {
      <span class="word">
        <span class="name">KIBABU <b>CARS</b></span>
        <span class="tag">Car rental in Zanzibar</span>
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 12px; color: inherit; }
    .badge { position: relative; display: grid; place-items: center; flex: none; border-radius: 50%; }
    .ring {
      position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, #c9a46a, #2f8f3e, #c9a46a 45%, #e9cf9f, #2f8f3e 80%, #c9a46a);
      animation: turn 9s linear infinite;
    }
    .ring::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: #fff; }
    img { position: relative; width: calc(100% - 6px); height: calc(100% - 6px); border-radius: 50%; object-fit: cover; transition: transform .4s cubic-bezier(.2,.7,.2,1); }
    :host(:hover) img { transform: translateX(3px) rotate(-3deg); }
    :host(:hover) .ring { animation-duration: 2.5s; }
    @keyframes turn { to { transform: rotate(360deg); } }
    .word { display: flex; flex-direction: column; line-height: 1; }
    .name { font-family: var(--sans); font-weight: 800; font-style: italic; font-size: 1.22rem; letter-spacing: .01em; }
    .name b { color: #3fae4f; font-weight: 800; }
    .tag { font-size: .66rem; font-weight: 600; letter-spacing: .08em; opacity: .7; margin-top: 4px; }
    :host(.on-light) .name b { color: #1f7a2c; }
    @media (prefers-reduced-motion: reduce) { .ring { animation: none; } }
  `,
})
export class Logo {
  readonly size = input(46);
  readonly compact = input(false);
  readonly light = input(false);
}
