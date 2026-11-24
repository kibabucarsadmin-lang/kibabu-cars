import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

/** Counts a number up from 0 when it scrolls into view: <span [kbCountUp]="1000" suffix="+"></span> */
@Directive({ selector: '[kbCountUp]', host: { '[textContent]': 'initial()' } })
export class CountUp implements OnDestroy {
  readonly kbCountUp = input.required<number>();
  readonly suffix = input('');
  readonly decimals = input(0);
  private io?: IntersectionObserver;
  private el = inject(ElementRef<HTMLElement>).nativeElement;

  protected initial() { return this.format(this.kbCountUp()); }
  private format(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() }) + this.suffix(); }

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const target = this.kbCountUp();
      this.el.textContent = this.format(0);
      this.io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        this.io?.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const k = Math.min((t - t0) / 1400, 1);
          this.el.textContent = this.format(target * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      this.io.observe(this.el);
    });
  }
  ngOnDestroy() { this.io?.disconnect(); }
}
