import { tx } from '../../../shared/i18n';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { whatsappLink } from '../../../shared/business';
import { ContentStore } from '../../core/content-store';
import { Seo } from '../../core/seo';
import { PageHero } from '../../shared/page-hero';
import { Reveal } from '../../shared/reveal';
import { TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-faq',
  imports: [TPipe, FormsModule, MatButtonModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, PageHero, Reveal],
  template: `
    <kb-page-hero [title]="'Questions, answered' | t" [text]="'Permits, payment, insurance, delivery and the rules of the road. Search, or browse by topic.' | t">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [placeholder]="'Try “permit”, “deposit” or “late”' | t" [ngModel]="q()" (ngModelChange)="q.set($event)" [attr.aria-label]="'Search FAQ' | t" />
      </mat-form-field>
      @if (q()) { <p class="count">{{ (hits() === 1 ? '{n} answer found' : '{n} answers found') | t: { n: hits() } }}</p> }
    </kb-page-hero>
    <section class="section">
      <div class="wrap layout">
        <nav class="toc" [attr.aria-label]="'FAQ topics' | t">
          @for (g of groups(); track g.id) {
            <a [href]="'/faq#' + g.id">{{ g.title }}</a>
          }
        </nav>
        <div>
          @for (g of groups(); track g.id) {
            <section [id]="g.id" class="group" kbReveal>
              <h2>{{ g.title }}</h2>
              <mat-accordion multi>
                @for (it of g.items; track it.q) {
                  <mat-expansion-panel [expanded]="!!q()">
                    <mat-expansion-panel-header><mat-panel-title>{{ it.q }}</mat-panel-title></mat-expansion-panel-header>
                    <p>{{ it.a }}</p>
                  </mat-expansion-panel>
                }
              </mat-accordion>
            </section>
          } @empty {
            <p class="muted">{{ 'No answers match “{q}”. Ask us directly on WhatsApp!' | t: { q: q() } }}</p>
          }
          <div class="ask" kbReveal>
            <div><h3>{{ 'Didn’t find it?' | t }}</h3><p class="muted">{{ 'Ask us on WhatsApp. We usually reply within minutes, day or night.' | t }}</p></div>
            <a mat-flat-button class="btn-lg btn-wa" [href]="wa" target="_blank" rel="noopener">{{ 'Ask on WhatsApp' | t }}</a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .search { width: 100%; max-width: 520px; margin-top: 24px; background: #fff; border-radius: 6px; }
    .count { color: #c7d0c9; margin-top: 10px; font-size: .95rem; }
    mat-expansion-panel { transition: background .25s; }
    mat-expansion-panel.mat-expanded { background: #fff !important; box-shadow: inset 3px 0 0 var(--brass) !important; }
    mat-expansion-panel p { animation: fadein .35s ease; }
    @keyframes fadein { from { opacity: 0; transform: translateY(-4px); } }
    .layout { display: grid; grid-template-columns: 220px 1fr; gap: 56px; align-items: start; }
    .toc { position: sticky; top: calc(var(--header-h) + 32px); display: grid; border-top: 1px solid var(--line); }
    .toc a { padding: 12px 0; color: var(--ink); text-decoration: none; font-weight: 600; font-size: .95rem; border-bottom: 1px solid var(--line); }
    .toc a:hover { color: var(--brass); }
    .group { margin-bottom: 48px; scroll-margin-top: calc(var(--header-h) + 24px); }
    .group h2 { font-size: 1.7rem; }
    mat-accordion { --mat-expansion-container-shape: 0; --mat-expansion-container-background-color: transparent; --mat-expansion-header-text-weight: 700; --mat-expansion-header-text-size: 1.02rem; }
    mat-expansion-panel { box-shadow: none !important; border-top: 1px solid var(--line); border-radius: 0 !important; }
    mat-expansion-panel p { color: var(--muted); max-width: 64ch; }
    .ask { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 28px 0; border-top: 2px solid var(--ink); flex-wrap: wrap; }
    .ask h3 { margin: 0; } .ask p { margin: 0; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } .toc { display: none; } }
  `,
})
export class Faq {
  private store = inject(ContentStore);
  protected readonly q = signal('');
  protected readonly wa = whatsappLink('Hello Kibabu Cars, I have a question: ');
  protected readonly hits = computed(() => this.groups().reduce((n, g) => n + g.items.length, 0));
  protected readonly groups = computed(() => {
    const q = this.q().trim().toLowerCase();
    const faq = this.store.faq();
    if (!q) return faq;
    return faq.map((g) => ({ ...g, items: g.items.filter((i) => (i.q + ' ' + i.a).toLowerCase().includes(q)) })).filter((g) => g.items.length);
  });

  constructor() {
    const seo = inject(Seo);
    seo.set({
      title: tx('Zanzibar Car Rental FAQ – Permit, Insurance, Delivery'),
      description: tx('Answers about renting a car in Zanzibar: driving permit ($25), insurance, 50/50 payment, free airport delivery, fuel policy, age requirements and more.'),
      path: '/faq',
    });
    seo.jsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.store.faq().flatMap((g) => g.items).map((i) => ({
        '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a },
      })),
    });
  }
}
