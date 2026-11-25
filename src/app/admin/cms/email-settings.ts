import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminSettings, Api } from '../../core/api';

/**
 * Email (Resend) and database status.
 * The Resend key is write-only: once saved it is never shown again, only its last 4 characters.
 */
@Component({
  selector: 'kb-email-settings',
  imports: [FormsModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    @if (s(); as s) {
      <div class="cols">
        <div class="stack">
          <section class="box">
            <header>
              <div><h3>Booking emails</h3><p class="muted">Sent with Resend from <strong>{{ s.sender }}</strong></p></div>
              <span class="pill" [class.on]="s.email.source !== 'none'">
                <mat-icon>{{ s.email.source !== 'none' ? 'check_circle' : 'error' }}</mat-icon>{{ s.email.source !== 'none' ? 'Key added' : 'No key yet' }}
              </span>
            </header>

            @if (s.email.unreadable) {
              <p class="warn"><mat-icon>warning</mat-icon> The saved key can no longer be read (the server's ADMIN_SECRET changed). Paste the key again.</p>
            }
            @if (s.email.source === 'admin') {
              <div class="current"><mat-icon>key</mat-icon><span>API key <code>re_{{ s.email.hint }}</code></span>
                <button mat-button type="button" (click)="remove()" [disabled]="busy()">Remove</button></div>
            } @else if (s.email.source === 'env') {
              <div class="current"><mat-icon>dns</mat-icon><span>Using the key from the server settings (<code>RESEND_API_KEY</code>, ending {{ s.email.hint }}). A key saved here takes its place.</span></div>
            }

            <form (ngSubmit)="saveKey()" class="row">
              <mat-form-field class="grow">
                <mat-label>{{ s.email.source === 'admin' ? 'Replace the API key' : 'Resend API key' }}</mat-label>
                <mat-icon matPrefix>key</mat-icon>
                <input matInput name="k" [type]="show() ? 'text' : 'password'" [(ngModel)]="key" placeholder="re_…" autocomplete="off" spellcheck="false" />
                <button mat-icon-button matSuffix type="button" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide key' : 'Show key'"><mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
                <mat-hint>Saved encrypted. It is never shown again after saving.</mat-hint>
              </mat-form-field>
              <button mat-flat-button class="btn-brass" [disabled]="busy() || !key.trim()">Save key</button>
            </form>

            <p class="fixed"><mat-icon>inbox</mat-icon> Emails are sent from <strong>info&#64;kibabucars.com</strong>. Booking alerts, contact messages and guest replies all go to <strong>info&#64;kibabucars.com</strong>.</p>

            <div class="test">
              <h4>Send a test email</h4>
              <form (ngSubmit)="test()" class="row">
                <mat-form-field class="grow">
                  <mat-label>Send it to</mat-label><mat-icon matPrefix>send</mat-icon>
                  <input matInput type="email" name="t" [(ngModel)]="testTo" placeholder="you@example.com" />
                </mat-form-field>
                <button mat-flat-button [disabled]="busy() || s.email.source === 'none' || !testTo.trim()">Send test</button>
              </form>
              @if (testResult(); as r) {
                <p class="result" [class.bad]="!r.ok"><mat-icon>{{ r.ok ? 'mark_email_read' : 'error' }}</mat-icon>{{ r.text }}</p>
              }
            </div>
          </section>

          <section class="box">
            <header>
              <div><h3>Database</h3><p class="muted">Where bookings, cars and page texts are kept.</p></div>
              <span class="pill" [class.on]="isDb() && !s.database.error" [class.mid]="!isDb()">
                <mat-icon>{{ isDb() && !s.database.error ? 'check_circle' : 'info' }}</mat-icon>{{ dbLabel() }}
              </span>
            </header>
            @if (s.database.error) { <p class="warn"><mat-icon>warning</mat-icon> Last save to the database failed: {{ s.database.error }}. It retries every 10 seconds; nothing is lost.</p> }
            @if (s.database.storage === 'file') { <p class="muted">Data is in <code>data/db.json</code> on the server. To use a database, add <code>DATABASE_URL</code> (PostgreSQL or MySQL) to the server's environment settings and restart.</p> }
            @if (s.database.storage === 'demo') { <p class="muted">This demo keeps data in your browser only.</p> }
            <p class="muted small"><mat-icon>lock</mat-icon> The database login stays in the server's environment settings, not here, so a stolen admin password can't redirect your data.</p>
          </section>

          <section class="box">
            <h3>Before the first email goes out</h3>
            <ol class="steps">
              <li>In Resend, open <strong>Domains</strong>, add <code>kibabucars.com</code> and add the DNS records it shows. Wait until it says <em>Verified</em>.</li>
              <li>Open <strong>API Keys</strong>, create a key with <em>Sending access</em> and paste it above.</li>
              <li>Send a test email to yourself and check it arrives (also check Spam the first time).</li>
            </ol>
          </section>
        </div>

        <section class="box preview">
          <header>
            <div><h3>Preview</h3><p class="muted">With a sample booking.</p></div>
            <mat-button-toggle-group [value]="kind()" (change)="loadPreview($event.value)" hideSingleSelectionIndicator>
              <mat-button-toggle value="guest">To the guest</mat-button-toggle>
              <mat-button-toggle value="office">To you</mat-button-toggle>
            </mat-button-toggle-group>
          </header>
          @if (preview(); as html) { <iframe title="Email preview" sandbox [srcdoc]="html"></iframe> }
        </section>
      </div>
    }
  `,
  styles: `
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
    .stack { display: grid; gap: 20px; }
    .box { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; display: grid; gap: 14px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    h3 { margin: 0; font-size: 1.15rem; } h4 { margin: 0 0 8px; font-size: 1rem; }
    p { margin: 0; }
    .muted { color: var(--muted); } .small { font-size: .88rem; }
    .small mat-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; margin-right: 4px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px 5px 8px; border-radius: 999px; font-weight: 700; font-size: .85rem; background: #fdecea; color: #a1281b; white-space: nowrap; }
    .pill.on { background: #e3f5f2; color: #00676d; } .pill.mid { background: #eef2f3; color: #43585d; }
    .pill mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .current { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--foam, #f3fbfa); }
    .current span { flex: 1; }
    .row { display: flex; gap: 10px; align-items: flex-start; }
    .row button { margin-top: 8px; }
    .grow { flex: 1; }
    .test { border-top: 1px solid var(--line); padding-top: 14px; }
    .fixed { display: flex; gap: 10px; align-items: flex-start; margin: 4px 0 18px; padding: 12px 14px; border-radius: 10px; background: #eef7f6; line-height: 1.45; }
    .fixed mat-icon { color: #007f86; flex: none; }
    .result { display: flex; gap: 8px; align-items: center; color: #00676d; font-weight: 600; }
    .result.bad { color: #a1281b; }
    .warn { display: flex; gap: 8px; align-items: flex-start; background: #fff6e0; border-radius: 12px; padding: 10px 12px; color: #6b4a00; }
    .steps { margin: 0; padding-left: 20px; display: grid; gap: 8px; line-height: 1.5; }
    code { background: #eef2f3; padding: 1px 5px; border-radius: 5px; font-size: .9em; }
    .preview { position: sticky; top: 16px; }
    iframe { width: 100%; height: min(78vh, 900px); border: 1px solid var(--line); border-radius: 12px; background: #eef7f6; }
    @media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } .preview { position: static; } }
    @media (max-width: 560px) { .row { flex-direction: column; align-items: stretch; } .row button { margin-top: 0; } }
  `,
})
export class EmailSettings {
  private api = inject(Api);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  protected readonly s = signal<AdminSettings | null>(null);
  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  protected readonly kind = signal<'guest' | 'office'>('guest');
  protected readonly preview = signal<SafeHtml | null>(null);
  protected readonly testResult = signal<{ ok: boolean; text: string } | null>(null);
  protected key = '';
  protected owner = '';
  protected testTo = '';
  protected readonly isDb = computed(() => ['mysql', 'postgres'].includes(this.s()?.database.storage ?? ''));
  protected readonly dbLabel = computed(() => {
    const d = this.s()?.database;
    if (!d) return '';
    const name = d.storage === 'postgres' ? 'PostgreSQL' : 'MySQL';
    if (d.storage === 'mysql' || d.storage === 'postgres') return d.error ? `${name}: retrying` : `${name} connected`;
    return d.storage === 'demo' ? 'Demo' : 'JSON file';
  });

  constructor() {
    this.api.settings().then((s) => this.apply(s)).catch((e) => this.toast(e.message));
    void this.loadPreview('guest');
  }

  private apply(s: AdminSettings) {
    this.s.set(s);
    this.owner = s.email.ownerEmail;
    if (!this.testTo) this.testTo = s.email.ownerEmail || s.email.ownerDefault || '';
  }

  protected async loadPreview(kind: 'guest' | 'office') {
    this.kind.set(kind);
    try {
      // the HTML is built by our own code with every booking value escaped; the frame is sandboxed (no scripts)
      this.preview.set(this.sanitizer.bypassSecurityTrustHtml(await this.api.emailPreview(kind)));
    } catch (e) {
      this.toast((e as Error).message);
    }
  }

  protected async saveKey() {
    await this.save({ resendKey: this.key.trim() }, 'API key saved');
    this.key = '';
    this.show.set(false);
  }
  protected remove() {
    if (!confirm('Remove the saved API key? Booking emails stop until you add one again.')) return;
    void this.save({ removeKey: true }, 'API key removed');
  }
  protected saveOwner() { void this.save({ ownerEmail: this.owner.trim() }, 'Saved'); }

  private async save(body: { resendKey?: string; removeKey?: boolean; ownerEmail?: string }, done: string) {
    this.busy.set(true);
    try {
      this.apply(await this.api.saveEmailSettings(body));
      this.testResult.set(null);
      this.toast(done);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async test() {
    this.busy.set(true);
    this.testResult.set(null);
    try {
      await this.api.testEmail(this.testTo.trim());
      this.testResult.set({ ok: true, text: `Sent to ${this.testTo.trim()}. It should arrive within a minute.` });
    } catch (e) {
      this.testResult.set({ ok: false, text: (e as Error).message });
    } finally {
      this.busy.set(false);
    }
  }

  private toast(msg: string) { this.snack.open(msg, 'OK', { duration: 4000 }); }
}
