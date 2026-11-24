import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MissingLink, Redirect, redirectPath } from '../../../shared/content';
import { Api } from '../../core/api';

interface Row extends Redirect { key: number }

/**
 * Admin → Redirects. When someone opens an old link (Google, the old WordPress site, a flyer,
 * a bookmark), send them to the right page with a permanent 301 redirect.
 */
@Component({
  selector: 'kb-redirects-editor',
  imports: [DatePipe, FormsModule, MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
  template: `
    <div class="intro">
      <mat-icon class="intro-ic">alt_route</mat-icon>
      <div>
        <p><strong>Send old links to the right page.</strong> When someone opens an address that no longer exists, from Google, the old website, a flyer or a bookmark, they are taken to the page you choose instead of "Page not found".</p>
        <p class="muted">Google moves the old link's ranking to the new page, so you don't lose visitors.</p>
      </div>
    </div>

    @if (missing().length) {
      <section class="missing">
        <header>
          <h3><mat-icon>link_off</mat-icon> Links that found nothing</h3>
          <button mat-button (click)="clearMissing()">Clear list</button>
        </header>
        <p class="muted small">Visitors opened these addresses and saw "Page not found". Redirect the ones that should lead somewhere.</p>
        <ul>
          @for (m of missing(); track m.path) {
            <li>
              <code class="path">{{ m.path }}</code>
              <span class="meta">{{ m.hits }} {{ m.hits === 1 ? 'visit' : 'visits' }}, last {{ m.last | date: 'd MMM' }}</span>
              <button mat-stroked-button (click)="redirectMissing(m)"><mat-icon>alt_route</mat-icon> Redirect</button>
            </li>
          }
        </ul>
      </section>
    }

    <div class="bar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Find a link</mat-label>
        <input matInput [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </mat-form-field>
      <div class="bar-btns">
        <button mat-stroked-button (click)="add()"><mat-icon>add</mat-icon> Add redirect</button>
        <button mat-flat-button class="btn-brass" (click)="save()" [disabled]="busy() || !dirty()">{{ dirty() ? 'Save changes' : 'Saved' }}</button>
      </div>
    </div>

    <div class="head" aria-hidden="true"><span>Old link</span><span></span><span>Goes to</span><span></span></div>
    @for (r of shown(); track r.key) {
      <div class="row" [class.bad]="problem(r)">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Old link</mat-label>
          <span matTextPrefix class="host">{{ host }}</span>
          <input matInput [(ngModel)]="r.from" (ngModelChange)="touch()" (blur)="tidy(r)" placeholder="/old-page" [attr.id]="'from-' + r.key" />
        </mat-form-field>
        <mat-icon class="arrow">arrow_forward</mat-icon>
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Goes to</mat-label>
          <input matInput [(ngModel)]="r.to" (ngModelChange)="touch()" [matAutocomplete]="pick" placeholder="/fleet" />
          <mat-autocomplete #pick="matAutocomplete" (optionSelected)="touch()">
            @for (p of suggestions(r.to); track p.path) {
              <mat-option [value]="p.path"><span class="opt">{{ p.label }}</span> <code>{{ p.path }}</code></mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
        <div class="acts">
          <a mat-icon-button [href]="r.from" target="_blank" rel="noopener" matTooltip="Test this link" [disabled]="!r.from || dirty()"><mat-icon>open_in_new</mat-icon></a>
          <button mat-icon-button (click)="remove(r)" matTooltip="Delete" aria-label="Delete redirect"><mat-icon>delete</mat-icon></button>
        </div>
        @if (problem(r); as p) { <p class="err">{{ p }}</p> }
      </div>
    } @empty {
      <p class="empty muted">{{ q() ? 'No link matches your search.' : 'No redirects yet. Add one, or pick from "Links that found nothing" when it appears.' }}</p>
    }
    <p class="muted small foot">{{ rows().length }} redirects. Links to car pages of the old site (/rental/…) are handled automatically.</p>
  `,
  styles: `
    :host { display: block; }
    .intro { display: flex; gap: 14px; padding: 16px 18px; border-radius: 14px; background: var(--foam); margin-bottom: 18px; }
    .intro p { margin: 0 0 4px; } .intro-ic { color: var(--lagoon); flex-shrink: 0; margin-top: 2px; }
    .small { font-size: .85rem; }
    .missing { border: 1px solid #f3d27a; background: #fffaf0; border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; }
    .missing header { display: flex; justify-content: space-between; align-items: center; }
    .missing h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1rem; font-family: var(--sans); }
    .missing h3 mat-icon { color: var(--sun-deep); }
    .missing p { margin: 4px 0 10px; }
    .missing ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .missing li { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-top: 1px solid #f3e3b8; }
    .path { font-size: .9rem; background: #fff; padding: 3px 8px; border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50%; }
    .meta { color: var(--muted); font-size: .85rem; flex: 1; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .search { width: min(320px, 100%); }
    .bar-btns { display: flex; gap: 8px; }
    .head, .row { display: grid; grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 88px; gap: 8px; align-items: center; }
    .head { font-size: .78rem; font-weight: 700; color: var(--muted); padding: 0 4px 4px; }
    .row { padding: 8px 0; border-top: 1px solid var(--line); }
    .row.bad mat-form-field:first-child { --mdc-outlined-text-field-outline-color: var(--coral); }
    .host { color: var(--muted); font-size: .85rem; white-space: nowrap; }
    .arrow { color: var(--lagoon); justify-self: center; }
    .acts { display: flex; justify-content: flex-end; }
    .err { grid-column: 1 / -1; margin: 0; color: #c0392b; font-size: .83rem; }
    .opt { font-weight: 600; } mat-option code { color: var(--muted); font-size: .8rem; margin-left: 6px; }
    .empty { padding: 24px 0; text-align: center; }
    .foot { margin-top: 12px; }
    @media (max-width: 760px) {
      .head { display: none; }
      .row { grid-template-columns: 1fr auto; }
      .arrow { display: none; }
      .row > mat-form-field:nth-of-type(2) { grid-column: 1; }
      .acts { grid-row: 1 / span 2; grid-column: 2; flex-direction: column; }
      .path { max-width: 100%; }
      .missing li { flex-wrap: wrap; }
    }
  `,
})
export class RedirectsEditor {
  private api = inject(Api);
  private snack = inject(MatSnackBar);
  protected readonly rows = signal<Row[]>([]);
  protected readonly missing = signal<MissingLink[]>([]);
  protected readonly q = signal('');
  protected readonly busy = signal(false);
  protected readonly dirty = signal(false);
  private pages: { path: string; label: string }[] = [];
  private nextKey = 1;
  protected readonly host = typeof location !== 'undefined' ? location.host : 'kibabucars.com';

  protected readonly shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    const list = this.rows();
    return q ? list.filter((r) => r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q)) : list;
  });

  constructor() { void this.load(); }

  private async load() {
    try {
      const [data, cars, content] = await Promise.all([this.api.redirects(), this.api.adminCars(), this.api.adminContent()]);
      this.rows.set(data.redirects.map((r) => ({ ...r, key: this.nextKey++ })));
      this.missing.set(data.missing);
      this.pages = [
        { path: '/', label: 'Home' },
        { path: '/fleet', label: 'Cars & prices' },
        ...cars.map((c) => ({ path: `/fleet/${c.id}`, label: c.name })),
        { path: '/book', label: 'Book a car' },
        { path: '/my-booking', label: 'My booking' },
        { path: '/about', label: 'About' },
        { path: '/faq', label: 'FAQ' },
        { path: '/contact', label: 'Contact' },
        { path: '/blog', label: 'Blog' },
        ...content.blog.map((p) => ({ path: `/blog/${p.slug}`, label: p.title })),
        { path: '/terms', label: 'Terms & conditions' },
      ];
    } catch { /* the Api shows the error */ }
  }

  protected suggestions(typed: string) {
    const t = (typed || '').toLowerCase();
    return this.pages.filter((p) => !t || p.path.includes(t) || p.label.toLowerCase().includes(t)).slice(0, 12);
  }

  protected problem(r: Row): string | null {
    const from = r.from.trim();
    if (!from && !r.to.trim()) return null;
    if (!from) return 'Enter the old link.';
    if (!redirectPath(from)) return 'This old link has characters that can\'t be used.';
    const f = redirectPath(from);
    if (f === '/') return 'The home page can\'t be redirected.';
    if (/^\/(api|admin|uploads|media)(\/|$)/i.test(f)) return 'This address is used by the website itself.';
    if (!r.to.trim()) return 'Choose where this link should go.';
    if (redirectPath(r.to) === f) return 'A link can\'t go to itself.';
    if (this.rows().some((x) => x !== r && redirectPath(x.from).toLowerCase() === f.toLowerCase())) return 'This old link is already in the list.';
    return null;
  }

  protected touch() { this.dirty.set(true); }

  protected tidy(r: Row) {
    const p = redirectPath(r.from);
    if (r.from.trim() && p && p !== r.from) { r.from = p; this.rows.update((l) => [...l]); }
  }

  protected add(from = '') {
    const row: Row = { from, to: '', key: this.nextKey++ };
    this.rows.update((l) => [row, ...l]);
    this.q.set('');
    this.dirty.set(true);
    if (!from) setTimeout(() => document.getElementById(`from-${row.key}`)?.focus(), 50);
    return row;
  }

  protected redirectMissing(m: MissingLink) {
    this.add(m.path);
    setTimeout(() => document.querySelectorAll<HTMLInputElement>('.row input')[1]?.focus(), 80);
    this.missing.update((l) => l.filter((x) => x !== m));
  }

  protected remove(r: Row) {
    this.rows.update((l) => l.filter((x) => x !== r));
    this.dirty.set(true);
  }

  protected async save() {
    const list = this.rows().filter((r) => r.from.trim() || r.to.trim());
    const bad = list.find((r) => this.problem(r));
    if (bad) { this.snack.open(`Fix this first: ${this.problem(bad)}`, 'OK', { duration: 5000 }); return; }
    this.busy.set(true);
    try {
      const data = await this.api.saveRedirects(list.map(({ from, to }) => ({ from: redirectPath(from), to: /^https:/i.test(to) ? to.trim() : redirectPath(to) })));
      this.rows.set(data.redirects.map((r) => ({ ...r, key: this.nextKey++ })));
      this.missing.set(data.missing);
      this.dirty.set(false);
      this.snack.open('Redirects saved. They work right away.', 'OK', { duration: 3000 });
    } catch { /* shown by Api */ } finally { this.busy.set(false); }
  }

  protected async clearMissing() {
    try { await this.api.clearMissing(); this.missing.set([]); } catch { /* shown by Api */ }
  }
}
