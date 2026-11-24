import { tx } from '../../../shared/i18n';
import { BookingReceipt } from '../../shared/booking-receipt';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LOCATIONS, whatsappLink } from '../../../shared/business';
import { Booking, LocationId } from '../../../shared/models';
import { Api } from '../../core/api';
import { Seo } from '../../core/seo';
import { I18n, TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-my-booking',
  imports: [TPipe, BookingReceipt, DatePipe, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <section class="page-hero">
      <div class="wrap">
        <h1>{{ 'My booking' | t }}</h1>
        <p>{{ 'Check your reservation or cancel it for free before pickup.' | t }}</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap narrow">
        @if (!booking()) {
          <form class="card lookup" (ngSubmit)="find()">
            <mat-form-field>
              <mat-label>{{ 'Booking reference' | t }}</mat-label>
              <mat-icon matPrefix>confirmation_number</mat-icon>
              <input matInput name="ref" [(ngModel)]="ref" [placeholder]="'KB-XXXXX' | t" required />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'Email used for booking' | t }}</mat-label>
              <mat-icon matPrefix>mail</mat-icon>
              <input matInput name="email" type="email" [(ngModel)]="email" required />
            </mat-form-field>
            @if (error()) { <p class="err" role="alert">{{ error() | t }}</p> }
            <button mat-flat-button class="btn-lg btn-brass" [disabled]="loading()">{{ 'Find my booking' | t }}</button>
          </form>
        } @else {
          @let b = booking()!;
          <div class="card result">
            <div class="head">
              <div><small class="muted">{{ 'Reference' | t }}</small><h2>{{ b.ref }}</h2></div>
              <span class="status status--{{ b.status }}">{{ b.status }}</span>
            </div>
            <dl>
              <div><dt>{{ 'Car' | t }}</dt><dd>{{ b.carName }}</dd></div>
              <div><dt>{{ 'Pickup' | t }}</dt><dd>{{ b.pickupAt | date: 'EEE d MMM y, HH:mm' }} · {{ loc(b.pickupLocation) }}</dd></div>
              <div><dt>{{ 'Return' | t }}</dt><dd>{{ b.returnAt | date: 'EEE d MMM y, HH:mm' }} · {{ loc(b.returnLocation) }}</dd></div>
              <div><dt>{{ 'Drivers' | t }}</dt><dd>{{ b.drivers }} {{ '(Zanzibar permit arranged by us)' | t }}</dd></div>
            </dl>
            <kb-booking-receipt [booking]="b" />
            <div class="btns">
              <a mat-flat-button class="btn-wa" [href]="wa(b)" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> {{ 'Message us' | t }}</a>
              @if (b.status === 'pending' || b.status === 'confirmed') {
                @if (!confirmCancel()) {
                  <button mat-stroked-button (click)="confirmCancel.set(true)">{{ 'Cancel booking' | t }}</button>
                } @else {
                  <button mat-flat-button class="danger" (click)="cancel()" [disabled]="loading()">{{ 'Yes, cancel it' | t }}</button>
                  <button mat-button (click)="confirmCancel.set(false)">{{ 'Keep booking' | t }}</button>
                }
              }
              <button mat-button (click)="booking.set(null)">{{ 'Look up another' | t }}</button>
            </div>
            @if (error()) { <p class="err" role="alert">{{ error() | t }}</p> }
          </div>
        }
        <p class="muted center">{{ 'Lost your reference?' | t }} <a routerLink="/contact">{{ 'Contact us' | t }}</a> {{ 'and we’ll help.' | t }}</p>
      </div>
    </section>
  `,
  styles: `
    .narrow { max-width: 640px; }
    .lookup { padding: 28px; display: grid; gap: 14px; }
    .err { color: #b42318; font-weight: 600; margin: 0; }
    .result { padding: 28px; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .head h2 { margin: 0; letter-spacing: .06em; }
    dl { margin: 0; display: grid; gap: 0; }
    dl div { display: grid; grid-template-columns: 90px 1fr; padding: 10px 0; border-top: 1px solid var(--line); }
    dt { color: var(--muted); }
    dd { margin: 0; }
    .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
    .danger { background: #b42318 !important; color: #fff !important; }
    .center { text-align: center; margin-top: 24px; }
  `,
})
export class MyBooking {
  private i18n = inject(I18n);
  private api = inject(Api);
  protected ref = inject(ActivatedRoute).snapshot.queryParamMap.get('ref') ?? '';
  protected email = '';
  protected readonly booking = signal<Booking | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly confirmCancel = signal(false);

  constructor() {
    inject(Seo).set({ title: tx('My booking'), description: tx('Manage your Kibabu Cars booking.'), path: '/my-booking', noindex: true });
  }

  protected loc(id: LocationId) {
    return this.i18n.t(LOCATIONS.find((l) => l.id === id)?.label ?? id);
  }

  protected wa(b: Booking) {
    return whatsappLink(`Hello Kibabu Cars, about my booking ${b.ref} (${b.carName}): `);
  }

  async find() {
    this.error.set(null);
    this.loading.set(true);
    try {
      this.booking.set(await this.api.lookupBooking(this.ref.trim(), this.email.trim()));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async cancel() {
    const b = this.booking();
    if (!b) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      this.booking.set(await this.api.cancelBooking(b.ref, b.customer.email));
      this.confirmCancel.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
