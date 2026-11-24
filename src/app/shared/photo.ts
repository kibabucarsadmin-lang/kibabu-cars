import { Component, computed, input, signal } from '@angular/core';

/**
 * Image with a graceful fallback: if the photo is missing or fails to load,
 * a calm mangrove panel with the caption is shown instead of a broken icon.
 */
@Component({
  selector: 'kb-photo',
  template: `
    @if (current() && !failed()) {
      <img [src]="current()" [attr.srcset]="srcset()" [attr.sizes]="srcset() ? sizes() : null" [alt]="alt()" [attr.loading]="eager() ? 'eager' : 'lazy'" [attr.fetchpriority]="eager() ? 'high' : null"
        decoding="async" (error)="onError()" />
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt()">
        <span>{{ fallbackLabel() || alt() }}</span>
      </div>
    }
  `,
  styles: `
    :host { display: block; position: relative; overflow: hidden; background: #cdeeea; }
    img { width: 100%; height: 100%; object-fit: cover; object-position: var(--pos, center); }
    .fallback {
      position: absolute; inset: 0; display: flex; align-items: flex-end; padding: 18px;
      background:
        radial-gradient(120% 80% at 80% 0%, rgba(201,164,106,.28), transparent 60%),
        linear-gradient(160deg, #cdeeea, #06323d);
    }
    .fallback span { font-family: var(--serif); color: rgba(255,255,255,.75); font-size: 1.1rem; }
  `,
})
export class Photo {
  readonly src = input<string>('');
  readonly alt = input<string>('');
  readonly eager = input(false);
  readonly fallbackLabel = input<string>('');
  readonly sizes = input('(max-width: 700px) 100vw, 600px');
  /** Local image to use if src fails (e.g. remote photo blocked). */
  readonly fallbackSrc = input<string>('');
  private usingFallback = signal(false);
  protected readonly current = computed(() => (this.usingFallback() ? this.fallbackSrc() : this.src()));
  protected onError() {
    if (!this.usingFallback() && this.fallbackSrc()) this.usingFallback.set(true);
    else this.failed.set(true);
  }
  protected readonly failed = signal(false);
  /** Car photos ship in two widths: name.jpg (1200px) and name-sm.jpg (600px). */
  protected readonly srcset = computed(() => {
    const s = this.current();
    return /(^|\/)cars\/[^/]+\.jpg$/.test(s) && !s.endsWith('-sm.jpg') ? `${s.replace(/\.jpg$/, '-sm.jpg')} 600w, ${s} 1200w` : null;
  });
}
