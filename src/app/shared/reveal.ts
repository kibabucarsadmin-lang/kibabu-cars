import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

/**
 * Reveals an element when it scrolls into view.
 * kbReveal="up" (default) rises in; "drive" slides in from the right like a car pulling up.
 * Server-rendered HTML stays fully visible; the effect is added only in the browser.
 */
@Directive({ selector: '[kbReveal]' })
export class Reveal implements OnDestroy {
  readonly kbReveal = input<'up' | 'drive' | ''>('');
  readonly delay = input(0);
  private io?: IntersectionObserver;

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9) return; // already on screen: don't hide it
      el.classList.add('rv', 'rv--' + (this.kbReveal() || 'up'));
      el.style.transitionDelay = this.delay() + 'ms';
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { el.classList.add('in'); this.io?.disconnect(); }
      }, { rootMargin: '0px 0px -10% 0px' });
      this.io.observe(el);
    });
  }

  ngOnDestroy() { this.io?.disconnect(); }
}
