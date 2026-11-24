import { Component, computed, input } from '@angular/core';
import { LANG_NAMES, Lang } from '../../shared/i18n';

/** Simple SVG flags (images, so they look the same on every phone and computer – emoji flags don't show on Windows). */
const SVG: Record<Lang, string> = {
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><clipPath id="c"><rect width="60" height="40"/></clipPath><g clip-path="url(#c)"><rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12"/><path d="M30 0V40M0 20H60" stroke="#C8102E" stroke-width="7"/></g></svg>`,
  it: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#CE2B37"/></svg>`,
  ru: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#fff"/><rect y=".667" width="3" height=".667" fill="#0039A6"/><rect y="1.333" width="3" height=".667" fill="#D52B1E"/></svg>`,
  es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>`,
  de: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="3" fill="#FFCE00"/><rect width="5" height="2" fill="#DD0000"/><rect width="5" height="1" fill="#000"/></svg>`,
};
const URI = Object.fromEntries(Object.entries(SVG).map(([k, v]) => [k, 'data:image/svg+xml,' + encodeURIComponent(v)])) as Record<Lang, string>;

@Component({
  selector: 'kb-flag',
  template: `<img [src]="src()" [alt]="alt() ? name() : ''" width="30" height="20" />`,
  styles: `
    :host { display: inline-flex; flex: none; border-radius: 4px; overflow: hidden; box-shadow: 0 0 0 1px rgba(6, 50, 61, .14); line-height: 0; }
    img { width: var(--flag-w, 28px); height: calc(var(--flag-w, 28px) * 2 / 3); object-fit: cover; display: block; }
  `,
})
export class Flag {
  readonly lang = input.required<Lang>();
  /** give the image a text alternative (off when the parent link already names the language) */
  readonly alt = input(false);
  protected readonly src = computed(() => URI[this.lang()]);
  protected readonly name = computed(() => LANG_NAMES[this.lang()]);
}
