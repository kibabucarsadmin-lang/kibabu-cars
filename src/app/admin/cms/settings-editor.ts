import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Business } from '../../../shared/content';
import { Api } from '../../core/api';
import { ContentStore } from '../../core/content-store';

@Component({
  selector: 'kb-settings-editor',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    @if (b(); as b) {
      <form class="editor" (ngSubmit)="save()">
        <h3>Contact details</h3>
        <div class="grid">
          <mat-form-field><mat-label>Business name</mat-label><input matInput name="name" [(ngModel)]="b.name" /></mat-form-field>
          <mat-form-field><mat-label>Phone (as shown on the site)</mat-label><mat-icon matPrefix>call</mat-icon><input matInput name="phone" [(ngModel)]="b.phone" placeholder="+255 772 755 788" /></mat-form-field>
          <mat-form-field><mat-label>WhatsApp number</mat-label><mat-icon matPrefix>chat</mat-icon><input matInput name="wa" [(ngModel)]="b.whatsapp" placeholder="255772755788" /><mat-hint>Country code, digits only</mat-hint></mat-form-field>
          <mat-form-field><mat-label>Email</mat-label><mat-icon matPrefix>mail</mat-icon><input matInput type="email" name="email" [(ngModel)]="b.email" /></mat-form-field>
          <mat-form-field><mat-label>Address</mat-label><mat-icon matPrefix>location_on</mat-icon><input matInput name="addr" [(ngModel)]="b.address" /></mat-form-field>
          <mat-form-field><mat-label>P.O. Box</mat-label><input matInput name="po" [(ngModel)]="b.poBox" /></mat-form-field>
        </div>
        <h3>Social media</h3>
        <p class="muted">Paste the full link, starting with https://. Leave empty to hide it.</p>
        <div class="grid">
          <mat-form-field><mat-label>Facebook</mat-label><input matInput name="fb" [(ngModel)]="b.facebook" placeholder="https://www.facebook.com/…" /></mat-form-field>
          <mat-form-field><mat-label>Instagram</mat-label><input matInput name="ig" [(ngModel)]="b.instagram" placeholder="https://www.instagram.com/…" /></mat-form-field>
          <mat-form-field><mat-label>TikTok</mat-label><input matInput name="tt" [(ngModel)]="b.tiktok" placeholder="https://www.tiktok.com/@…" /></mat-form-field>
          <mat-form-field><mat-label>Tripadvisor</mat-label><input matInput name="ta" [(ngModel)]="b.tripadvisor" /></mat-form-field>
        </div>
        <h3>Numbers shown on the site</h3>
        <div class="grid four">
          <mat-form-field><mat-label>Years in business</mat-label><input matInput type="number" name="y" [(ngModel)]="b.stats.years" /></mat-form-field>
          <mat-form-field><mat-label>Rentals completed</mat-label><input matInput type="number" name="r" [(ngModel)]="b.stats.rentals" /></mat-form-field>
          <mat-form-field><mat-label>Cars in the fleet</mat-label><input matInput type="number" name="v" [(ngModel)]="b.stats.vehicles" /></mat-form-field>
          <mat-form-field><mat-label>Tripadvisor rating</mat-label><input matInput type="number" step="0.1" min="0" max="5" name="rt" [(ngModel)]="b.tripadvisorRating" /></mat-form-field>
        </div>
        <h3>Home page video</h3>
        <p class="muted">A short silent clip (10–20 s, MP4, under 8 MB) that plays behind the headline, such as drone footage of a Kibabu car on the coast road. Upload it to the server's <code>media</code> folder and enter <code>media/hero.mp4</code>, or paste a full https:// link. Leave empty to show a slow flyover of the photos.</p>
        <div class="grid one">
          <mat-form-field><mat-label>Video link</mat-label><input matInput name="hv" [(ngModel)]="b.heroVideo" placeholder="media/hero.mp4" /></mat-form-field>
        </div>
        <h3>Search engines and analytics</h3>
        <p class="muted">From Google Search Console and Bing Webmaster Tools (“HTML tag” method): paste only the code inside <code>content="…"</code>.</p>
        <div class="grid">
          <mat-form-field><mat-label>Google verification code</mat-label><input matInput name="gv" [(ngModel)]="b.googleVerification" /></mat-form-field>
          <mat-form-field><mat-label>Bing verification code</mat-label><input matInput name="bv" [(ngModel)]="b.bingVerification" /></mat-form-field>
          <mat-form-field><mat-label>Google Analytics 4 ID</mat-label><input matInput name="ga" [(ngModel)]="b.gaId" placeholder="G-XXXXXXXXXX" /></mat-form-field>
        </div>
        <h3>Google Ads</h3>
        <p class="muted">In Google Ads: <em>Goals → Conversions → New conversion action → Website</em>, name it “Booking”, category <em>Purchase</em>. Choose “Use Google tag manually”: it shows <code>send_to: 'AW-123456789/AbC-dEfGh'</code>. Paste the first part and the part after the slash. Visitors are asked for cookie consent before any Google tag loads.</p>
        <div class="grid">
          <mat-form-field><mat-label>Google Ads ID</mat-label><input matInput name="aw" [(ngModel)]="b.adsId" placeholder="AW-123456789" /></mat-form-field>
          <mat-form-field><mat-label>Booking conversion label</mat-label><input matInput name="awl" [(ngModel)]="b.adsLabel" placeholder="AbC-dEfGh" /></mat-form-field>
        </div>
        <div class="actions"><button mat-flat-button class="btn-brass" [disabled]="busy()">Save settings</button></div>
      </form>
    }
  `,
  styles: `
    .editor { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; display: grid; gap: 12px; max-width: 1000px; }
    h3 { margin: 6px 0 0; font-size: 1.15rem; }
    p { margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .grid.four { grid-template-columns: repeat(4, 1fr); }
    .grid.one { grid-template-columns: 1fr; }
    .actions { display: flex; justify-content: flex-end; }
    @media (max-width: 800px) { .grid, .grid.four { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .grid, .grid.four { grid-template-columns: 1fr; } }
  `,
})
export class SettingsEditor {
  private api = inject(Api);
  private store = inject(ContentStore);
  private snack = inject(MatSnackBar);
  protected readonly b = signal<Business | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    this.api.content().then((c) => this.b.set(structuredClone(c.business))).catch((e) => this.toast(e.message));
  }

  async save() {
    const b = this.b();
    if (!b) return;
    for (const k of ['facebook', 'instagram', 'tiktok', 'tripadvisor'] as const) {
      if (b[k] && !/^https?:\/\//i.test(b[k])) return this.toast(`The ${k} link must start with https://`);
    }
    this.busy.set(true);
    try {
      const saved = await this.api.saveBusiness(b);
      this.store.use({ business: saved });
      this.b.set(structuredClone(saved));
      this.toast('Settings saved. Reload the website to see the new details everywhere.');
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  private toast(m: string) { this.snack.open(m, 'OK', { duration: 4500 }); }
}
