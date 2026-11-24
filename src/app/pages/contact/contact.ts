import { tx } from '../../../shared/i18n';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BUSINESS, whatsappLink } from '../../../shared/business';
import { Api } from '../../core/api';
import { Seo } from '../../core/seo';
import { TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-contact',
  imports: [TPipe, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <section class="page-hero">
      <div class="wrap">
        <h1>{{ 'Talk to us' | t }}</h1>
        <p>{{ 'Someone is on the phone day and night. WhatsApp is the quickest way to reach us.' | t }}</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap layout">
        <div class="channels">
          <a class="ch card wa" [href]="wa" target="_blank" rel="noopener">
            <mat-icon>chat</mat-icon><div><strong>{{ 'WhatsApp' | t }}</strong><span>{{ b.phone }}</span></div><mat-icon class="go">arrow_forward</mat-icon>
          </a>
          <a class="ch card" [href]="tel"><mat-icon>call</mat-icon><div><strong>{{ 'Call us' | t }}</strong><span>{{ b.phone }}</span></div><mat-icon class="go">arrow_forward</mat-icon></a>
          <a class="ch card" [href]="'mailto:' + b.email"><mat-icon>mail</mat-icon><div><strong>{{ 'Email' | t }}</strong><span>{{ b.email }}</span></div><mat-icon class="go">arrow_forward</mat-icon></a>
          <div class="ch card"><mat-icon>location_on</mat-icon><div><strong>{{ 'Based in' | t }}</strong><span>{{ b.address }}</span></div></div>
          @if (b.facebook || b.instagram || b.tiktok) {
            <div class="socials">
              @if (b.instagram) { <a [href]="b.instagram" target="_blank" rel="noopener">{{ 'Instagram' | t }}</a> }
              @if (b.facebook) { <a [href]="b.facebook" target="_blank" rel="noopener">{{ 'Facebook' | t }}</a> }
              @if (b.tiktok) { <a [href]="b.tiktok" target="_blank" rel="noopener">{{ 'TikTok' | t }}</a> }
            </div>
          }
          <iframe class="map" [title]="'Map of Stone Town, Zanzibar' | t" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=Stone%20Town%2C%20Zanzibar&z=12&output=embed"></iframe>
        </div>

        <div class="form-card">
          @if (sent()) {
            <div class="ok"><mat-icon>mark_email_read</mat-icon><h2>{{ 'Message sent' | t }}</h2><p class="muted">{{ 'We’ll reply by email, usually the same day. For anything urgent, WhatsApp is faster.' | t }}</p></div>
          } @else {
            <h2>{{ 'Send us a message' | t }}</h2>
            <form [formGroup]="form" (ngSubmit)="send()" class="form">
              <div class="hp" aria-hidden="true"><label>{{ 'Website' | t }} <input formControlName="website" tabindex="-1" autocomplete="off" /></label></div>
              <mat-form-field><mat-label>{{ 'Name' | t }}</mat-label><input matInput formControlName="name" autocomplete="name" /><mat-error>{{ 'Required' | t }}</mat-error></mat-form-field>
              <mat-form-field><mat-label>{{ 'Email' | t }}</mat-label><input matInput type="email" formControlName="email" autocomplete="email" /><mat-error>{{ 'Valid email required' | t }}</mat-error></mat-form-field>
              <mat-form-field><mat-label>{{ 'Phone / WhatsApp' | t }}</mat-label><input matInput type="tel" formControlName="phone" autocomplete="tel" /></mat-form-field>
              <mat-form-field><mat-label>{{ 'Message' | t }}</mat-label><textarea matInput rows="5" formControlName="message"></textarea><mat-error>{{ 'Please write a message' | t }}</mat-error></mat-form-field>
              @if (error()) { <p class="err" role="alert">{{ error() | t }}</p> }
              <button mat-flat-button class="btn-lg btn-brass" [disabled]="busy()">{{ 'Send message' | t }}</button>
            </form>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 1.1fr; gap: clamp(28px, 5vw, 64px); align-items: start; }
    .channels { display: grid; gap: 0; border-top: 1px solid var(--line); }
    .ch { display: flex; align-items: center; gap: 16px; padding: 18px 4px; text-decoration: none; color: var(--ink); border: 0; border-bottom: 1px solid var(--line); border-radius: 0; background: none; }
    .ch > mat-icon:first-child { color: var(--brass); }
    .ch.wa > mat-icon:first-child { color: var(--wa); }
    .ch div { flex: 1; display: flex; flex-direction: column; }
    .ch strong { font-size: 1.05rem; }
    .ch span { color: var(--muted); }
    .go { color: var(--muted); }
    a.ch:hover strong { color: var(--brass); }
    .socials { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
    .socials a { padding: 10px 16px; border: 1px solid var(--line); border-radius: 999px; text-decoration: none; color: var(--ink); font-weight: 600; background: #fff; }
    .socials a:hover { border-color: var(--brass); color: var(--brass); }
    .map { width: 100%; height: 260px; border: 0; border-radius: var(--r-md); margin-top: 20px; filter: grayscale(.4); }
    .form-card { background: var(--paper); border-radius: var(--r-md); padding: clamp(22px, 4vw, 36px); }
    .form { display: grid; gap: 14px; }
    .err { color: #8f2a1d; margin: 0; font-weight: 600; }
    .ok { padding: 32px 0; }
    .ok mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--brass); }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class Contact {
  private api = inject(Api);
  protected readonly b = BUSINESS;
  protected readonly tel = 'tel:' + BUSINESS.phone.replace(/\s/g, '');
  protected readonly wa = whatsappLink('Hello Kibabu Cars! ');
  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(5)]],
    website: [''], // spam trap, hidden from people
  });

  constructor() {
    inject(Seo).set({
      title: tx('Contact Kibabu Cars – 24/7 WhatsApp +255 772 755 788'),
      description: tx('Contact Kibabu Cars Zanzibar 24/7 by WhatsApp, phone or email. Book your car, ask about our fleet or request free airport delivery.'),
      path: '/contact',
    });
  }

  async send() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.contact(this.form.getRawValue());
      this.sent.set(true);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
