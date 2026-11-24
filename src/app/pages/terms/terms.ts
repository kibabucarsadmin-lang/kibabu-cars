import { tx } from '../../../shared/i18n';
import { Component, inject } from '@angular/core';
import { BUSINESS, RULES } from '../../../shared/business';
import { Seo } from '../../core/seo';
import { TPipe } from '../../core/i18n';
import { Analytics } from '../../core/analytics';
import { EmailLink } from '../../shared/email-link';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [TPipe, MatButtonModule],
  selector: 'kb-terms',
  template: `
    <section class="page-hero"><div class="wrap"><h1>{{ 'Rental terms & privacy' | t }}</h1><p>{{ 'The short, plain-English version. Your signed rental agreement contains the full terms.' | t }}</p></div></section>
    <section class="section">
      <div class="wrap prose">
        <h2>{{ 'Rental terms' | t }}</h2>
        <ul>
          <li>{{ 'Minimum rental is {n} days. A rental day is 24 hours from the agreed pickup time.' | t: { n: r.minDays } }}</li>
          <li>{{ 'Drivers must be at least {age} years old and have held a licence for at least {years} year.' | t: { age: r.minAge, years: r.minLicenceYears } }}</li>
          <li>{{ 'Every driver needs a Zanzibar driving permit ({fee} per driver). It is included in every booking and arranged by us. Only authorised drivers may drive.' | t: { fee: '$' + r.permitFeePerDriver } }}</li>
          <li>{{ 'Prices include basic insurance (per the rental agreement), taxes and unlimited kilometres.' | t }}</li>
          <li>{{ 'Insurance does not cover tyres, rims, mirrors, glass, keys, underbody damage, negligence, misuse, unauthorised or impaired drivers, or traffic fines.' | t }}</li>
          <li>{{ 'Fuel policy: return the car with about the same fuel level as at pickup.' | t }}</li>
          <li>{{ 'Payment: 50% of the total online to confirm the booking, the remaining 50% in cash or by card on delivery. No damage deposit is held.' | t }}</li>
          <li>{{ 'Days are counted in 24-hour blocks from pickup. Extra time of 1 to {h} hours is free; 6 hours or more counts as one more day. The grace period and long-term discount do not apply to the Nissan Juke.' | t: { h: r.graceHours } }}</li>
          <li>{{ 'Coastal area delivery or collection costs $20 each way. Airport and Stone Town are free.' | t }}</li>
          <li>{{ 'Airport bookings require a flight number and passport number.' | t }}</li>
          <li>{{ 'Free cancellation before the scheduled pickup. No-shows are non-refundable. Unused days after an early return are not automatically refunded.' | t }}</li>
          <li>{{ 'The car may not leave Unguja island without written permission. No racing, extreme off-roading or smoking in the vehicle.' | t }}</li>
          <li>{{ 'Rentals of {n} days or more receive {save} off per day (all cars except the Nissan Juke).' | t: { n: r.longRentalFromDays, save: '$' + r.longRentalDiscountPerDay } }}</li>
        </ul>
        <h2 id="privacy">{{ 'Privacy' | t }}</h2>
        <p>{{ 'We only collect the information needed to handle your booking: your name, contact details, travel dates and – for the driving permit – copies of your licence, passport (and passport number for airport bookings), flight number and a photo. We use it only to provide your rental and arrange your permit, share it only with the authorities that issue the permit, and never sell it.' | t }}</p>
        <p>{{ 'Your booking details are stored on our secure server, and confirmation emails are sent through our email provider (Resend). We keep booking records only as long as the law requires.' | t }}</p>
        <h3>{{ 'Cookies' | t }}</h3>
        <p>{{ 'The site works without cookies. Only if you click “Accept” do we load Google Analytics and Google Ads, which use cookies to show us which pages and ads bring bookings. You can change your choice at any time with “Cookie settings” at the bottom of every page.' | t }}</p>
        @if (analytics.enabled()) { <p><button mat-stroked-button type="button" (click)="analytics.openSettings()">{{ 'Cookie settings' | t }}</button></p> }
        <p>{{ 'You can ask us at any time to see, correct or delete your personal data.' | t }}</p>
        <p>{{ 'Questions or deletion requests:' | t }} @if (mail.href()) { <a [href]="mail.href()">{{ mail.address() }}</a>. }</p>
      </div>
    </section>
  `,
  styles: `
    .prose { max-width: 780px; }
    .prose li { margin-bottom: 10px; }
  `,
})
export class Terms {
  protected readonly r = RULES;
  protected readonly b = BUSINESS;
  protected readonly analytics = inject(Analytics);
  protected readonly mail = inject(EmailLink);
  constructor() {
    inject(Seo).set({ title: tx('Rental terms & privacy'), description: tx('Kibabu Cars Zanzibar rental terms and privacy policy.'), path: '/terms' });
  }
}
