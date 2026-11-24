import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { AdminAuth } from '../../core/admin-auth';
import { Api } from '../../core/api';
import { Seo } from '../../core/seo';

@Component({
  selector: 'kb-admin-login',
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="split">
      <aside class="brand-side">
        <img class="photo" src="photos/hero.jpg" alt="" />
        <div class="shade"></div>
        <div class="brand-in">
          <a routerLink="/" class="mark"><img src="logo-badge.png" alt="" width="44" height="44" /><span>Kibabu Cars</span></a>
          <div>
            <h2>The back office.</h2>
            <p>Bookings, cars, prices and everything guests see on the website, in one place.</p>
            <ul>
              <li><span class="material-symbols-outlined">event_note</span> See today’s pickups and returns</li>
              <li><span class="material-symbols-outlined">sell</span> Change cars and daily prices</li>
              <li><span class="material-symbols-outlined">translate</span> Edit the site in five languages</li>
            </ul>
          </div>
        </div>
      </aside>

      <main class="form-side">
        <form class="box" (ngSubmit)="login()">
          <a routerLink="/" class="mark sm"><img src="logo-badge.png" alt="" width="36" height="36" /><span>Kibabu Cars</span></a>
          <h1>Welcome back</h1>
          <p class="muted">Log in to manage bookings and the website.</p>

          <label class="field" [class.bad]="error()">
            <span class="lbl">Password</span>
            <span class="input">
              <mat-icon>lock</mat-icon>
              <input [type]="show() ? 'text' : 'password'" name="pw" [(ngModel)]="password" autocomplete="current-password" required autofocus />
              <button type="button" class="eye" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
                <mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </span>
          </label>
          @if (error()) { <p class="err" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p> }

          <button mat-flat-button class="go" [disabled]="busy() || !password">
            {{ busy() ? 'Checking…' : 'Log in' }}
          </button>
          <a routerLink="/" class="back"><mat-icon>arrow_back</mat-icon> Back to the website</a>
        </form>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }
    .split { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100vh; background: #fff; }
    .brand-side { position: relative; overflow: hidden; color: #fff; }
    .photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .shade { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(6,50,61,.92) 0%, rgba(6,50,61,.72) 55%, rgba(0,127,134,.55) 100%); }
    .brand-in { position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 48px; }
    .mark { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; font-family: var(--serif); font-weight: 750; font-size: 1.2rem; }
    .mark img { border-radius: 50%; background: #fff; }
    h2 { font-family: var(--serif); font-size: clamp(2rem, 3.4vw, 3rem); line-height: 1.05; margin: 0 0 12px; color: #fff; }
    .brand-in p { color: #cfe3e5; max-width: 34ch; font-size: 1.05rem; margin: 0 0 24px; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    li { display: flex; align-items: center; gap: 12px; font-weight: 600; }
    li span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.12); color: var(--sun); font-size: 20px; }

    .form-side { display: grid; place-items: center; padding: 32px 24px; background: #f4f7f7; }
    .box { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
    .mark.sm { color: var(--sea); font-size: 1.05rem; display: none; }
    h1 { font-family: var(--serif); font-size: 2rem; margin: 0; letter-spacing: -0.02em; }
    .muted { color: var(--muted); margin: -6px 0 10px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-weight: 700; font-size: .9rem; }
    .input { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 6px 0 14px; border: 1px solid #cfe0df; border-radius: 12px; background: #fff; transition: border-color .15s, box-shadow .15s; }
    .input:focus-within { border-color: var(--lagoon-2); box-shadow: 0 0 0 4px rgba(0,166,166,.15); }
    .bad .input { border-color: #d92d20; }
    .input mat-icon { color: var(--muted); }
    .input input { flex: 1; border: 0; outline: 0; font: inherit; font-size: 1rem; background: none; min-width: 0; }
    .eye { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 10px; background: none; color: var(--muted); cursor: pointer; }
    .eye:hover { background: var(--foam); }
    .err { display: flex; align-items: center; gap: 6px; margin: 0; color: #b42318; font-weight: 600; font-size: .92rem; }
    .err mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .go.mat-mdc-unelevated-button { height: 52px; border-radius: 12px; background: var(--sea); color: #fff; font-weight: 800; font-size: 1rem; }
    .go.mat-mdc-unelevated-button:disabled { background: #9fb7ba; color: #fff; }
    .back { display: inline-flex; align-items: center; gap: 6px; align-self: center; color: var(--muted); text-decoration: none; font-weight: 600; font-size: .9rem; }
    .back mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .back:hover { color: var(--sea); }
    @media (max-width: 860px) {
      .split { grid-template-columns: 1fr; }
      .brand-side { display: none; }
      .mark.sm { display: inline-flex; }
    }
  `,
})
export class AdminLogin {
  private api = inject(Api);
  private auth = inject(AdminAuth);
  private router = inject(Router);
  protected password = '';
  protected readonly show = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(Seo).set({ title: 'Staff login', description: 'Admin', path: '/admin/login', noindex: true });
    if (this.auth.token()) this.router.navigate(['/admin']);
  }

  async login() {
    this.busy.set(true);
    this.error.set(null);
    try {
      const { token } = await this.api.login(this.password);
      this.auth.login(token);
      this.router.navigate(['/admin']);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
