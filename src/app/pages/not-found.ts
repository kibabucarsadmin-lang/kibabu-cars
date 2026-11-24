import { tx } from '../../shared/i18n';
import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Seo } from '../core/seo';
import { TPipe } from '../core/i18n';

@Component({
  selector: 'kb-not-found',
  imports: [TPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="section">
      <div class="wrap nf">
        <mat-icon>wrong_location</mat-icon>
        <h1>{{ 'Looks like you took a wrong turn' | t }}</h1>
        <p class="muted">{{ 'The page you’re looking for doesn’t exist or has moved.' | t }}</p>
        <div class="btns">
          <a mat-flat-button class="btn-lg btn-brass" routerLink="/">{{ 'Back to home' | t }}</a>
          <a mat-stroked-button class="btn-lg" routerLink="/fleet">{{ 'See our cars' | t }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .nf { text-align: center; max-width: 560px; }
    .nf mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--brass); }
    .btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
  `,
})
export class NotFound {
  constructor() {
    const res = inject(RESPONSE_INIT, { optional: true });
    if (res) res.status = 404;
    inject(Seo).set({ title: tx('Page not found'), description: tx('Page not found.'), path: '/404', noindex: true });
  }
}
