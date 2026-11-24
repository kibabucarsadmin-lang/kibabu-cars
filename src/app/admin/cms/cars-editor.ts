import { LangBar } from './lang-bar';
import { LANG_NAMES, Lang } from '../../../shared/i18n';
import { CarText } from '../../../shared/content';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CATEGORY_LABELS, sortFleet } from '../../../shared/business';
import { Car, CarCategory } from '../../../shared/models';
import { Api } from '../../core/api';
import { Fleet } from '../../core/fleet';
import { ImageField } from './image-field';

type Draft = Omit<Car, 'id'> & { id?: string; featuresText: string };

const blank = (): Draft => ({
  name: '', tagline: '', category: 'suv', pricePerDay: 35, seats: 5, doors: 5, bags: 2,
  transmission: 'Automatic', fuel: 'Petrol', fourByFour: true, aircon: true, bestFor: '', description: '',
  features: [], featuresText: 'Air conditioning, Automatic gearbox', image: '', units: 1, active: true,
  featured: false, noDiscount: false, pinned: false,
});

@Component({
  selector: 'kb-cars-editor',
  imports: [LangBar, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule, ImageField],
  template: `
    <kb-lang-bar [(lang)]="lang" (langChange)="draft.set(null)" />
    @if (draft(); as d) {
      @if (lang() !== 'en') {
      <form class="editor" (ngSubmit)="saveText()">
        <div class="ed-head">
          <h2>{{ d.name }} – {{ langName() }}</h2>
          <button mat-button type="button" (click)="draft.set(null)">Cancel</button>
        </div>
        <div class="grid">
          <mat-form-field class="span3"><mat-label>Short tagline</mat-label><input matInput name="tagline" [(ngModel)]="d.tagline" /></mat-form-field>
          <mat-form-field class="span3"><mat-label>Best for</mat-label><input matInput name="bestFor" [(ngModel)]="d.bestFor" /></mat-form-field>
          <mat-form-field class="span3"><mat-label>Description</mat-label><textarea matInput rows="4" name="desc" [(ngModel)]="d.description"></textarea></mat-form-field>
          <mat-form-field class="span3"><mat-label>Features (separate with commas)</mat-label><input matInput name="features" [(ngModel)]="d.featuresText" /></mat-form-field>
        </div>
        <p class="muted">Price, photo, seats and other details are the same in every language – change them in English.</p>
        <div class="actions"><button mat-flat-button class="btn-brass" type="submit" [disabled]="busy()">Save {{ langName() }} text</button></div>
      </form>
      } @else {
      <form class="editor" (ngSubmit)="save()">
        <div class="ed-head">
          <h2>{{ d.id ? 'Edit ' + d.name : 'Add a new car' }}</h2>
          <button mat-button type="button" (click)="draft.set(null)">Cancel</button>
        </div>
        <kb-image-field label="Car photo" [(value)]="d.image" />
        <div class="grid">
          <mat-form-field class="span2"><mat-label>Car name</mat-label><input matInput name="name" [(ngModel)]="d.name" required placeholder="e.g. Toyota RAV4 5-Door" /></mat-form-field>
          <mat-form-field class="span2"><mat-label>Short tagline</mat-label><input matInput name="tagline" [(ngModel)]="d.tagline" placeholder="e.g. Space for the whole crew" /></mat-form-field>
          <mat-form-field><mat-label>Type</mat-label>
            <mat-select name="category" [(ngModel)]="d.category">
              @for (c of cats; track c.id) { <mat-option [value]="c.id">{{ c.label }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field><mat-label>Price per day (USD)</mat-label><input matInput type="number" min="1" name="price" [(ngModel)]="d.pricePerDay" required /></mat-form-field>
          <mat-form-field><mat-label>How many in the fleet</mat-label><input matInput type="number" min="0" name="units" [(ngModel)]="d.units" /><mat-hint>Limits bookings for the same dates</mat-hint></mat-form-field>
          <mat-form-field><mat-label>Seats</mat-label><input matInput type="number" min="1" name="seats" [(ngModel)]="d.seats" /></mat-form-field>
          <mat-form-field><mat-label>Doors</mat-label><input matInput type="number" min="2" name="doors" [(ngModel)]="d.doors" /></mat-form-field>
          <mat-form-field><mat-label>Suitcases</mat-label><input matInput type="number" min="0" name="bags" [(ngModel)]="d.bags" /></mat-form-field>
          <mat-form-field><mat-label>Gearbox</mat-label>
            <mat-select name="trans" [(ngModel)]="d.transmission"><mat-option value="Automatic">Automatic</mat-option><mat-option value="Manual">Manual</mat-option></mat-select>
          </mat-form-field>
          <mat-form-field><mat-label>Fuel</mat-label>
            <mat-select name="fuel" [(ngModel)]="d.fuel"><mat-option value="Petrol">Petrol</mat-option><mat-option value="Diesel">Diesel</mat-option></mat-select>
          </mat-form-field>
          <mat-form-field class="span2"><mat-label>Best for</mat-label><input matInput name="bestFor" [(ngModel)]="d.bestFor" placeholder="e.g. Families of 4–5" /></mat-form-field>
          <mat-form-field class="span3"><mat-label>Description</mat-label><textarea matInput rows="4" name="desc" [(ngModel)]="d.description"></textarea></mat-form-field>
          <mat-form-field class="span3"><mat-label>Features (separate with commas)</mat-label><input matInput name="features" [(ngModel)]="d.featuresText" /></mat-form-field>
        </div>
        <div class="toggles">
          <mat-slide-toggle name="active" [(ngModel)]="d.active">Online (bookable)</mat-slide-toggle>
          <mat-slide-toggle name="ff" [(ngModel)]="d.fourByFour">4x4</mat-slide-toggle>
          <mat-slide-toggle name="ac" [(ngModel)]="d.aircon">Air conditioning</mat-slide-toggle>
          <mat-slide-toggle name="feat" [(ngModel)]="d.featured">Show on home page</mat-slide-toggle>
          <mat-slide-toggle name="pin" [(ngModel)]="d.pinned">Always list first</mat-slide-toggle>
          <mat-slide-toggle name="nod" [(ngModel)]="d.noDiscount">No long-term / grace discount</mat-slide-toggle>
        </div>
        <div class="actions">
          <button mat-button type="button" (click)="draft.set(null)">Cancel</button>
          <button mat-flat-button class="btn-brass" [disabled]="busy()">{{ d.id ? 'Save changes' : 'Add car' }}</button>
        </div>
      </form>
      }
    } @else {
      <div class="bar">
        <p class="muted">{{ cars().length }} cars. Changes appear on the website straight away.</p>
        @if (lang() === 'en') { <button mat-flat-button class="btn-brass" (click)="add()"><mat-icon>add</mat-icon> Add a car</button> }
      </div>
      <div class="list">
        @for (c of cars(); track c.id) {
          <div class="row card" [class.off]="!c.active">
            <div class="thumb">@if (c.image) { <img [src]="c.image" alt="" /> }</div>
            <div class="info">
              <strong>{{ c.name }}</strong>
              <small class="muted">{{ cat(c.category) }}, {{ c.seats }} seats, {{ c.units }} in fleet{{ c.active ? '' : ', offline' }}</small>
            </div>
            <span class="price">\${{ c.pricePerDay }}<small>/day</small></span>
            <div class="btns">
              <button mat-stroked-button (click)="edit(c)"><mat-icon>edit</mat-icon> Edit</button>
              @if (confirmDel() === c.id) {
                <button mat-flat-button class="danger" (click)="remove(c)">Delete</button>
                <button mat-button (click)="confirmDel.set(null)">Keep</button>
              } @else {
                <button mat-icon-button (click)="confirmDel.set(c.id)" aria-label="Delete car"><mat-icon>delete</mat-icon></button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .bar p { margin: 0; }
    .list { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 640px), 1fr)); }
    .row { display: grid; grid-template-columns: 96px 1fr auto auto; gap: 14px; align-items: center; padding: 8px 12px 8px 8px; }
    .row.off { opacity: .55; }
    .thumb { aspect-ratio: 3 / 2; border-radius: 6px; overflow: hidden; background: var(--limestone); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .info { display: flex; flex-direction: column; }
    .price { font-family: var(--serif); font-size: 1.3rem; }
    .price small { font-family: var(--sans); font-size: .8rem; color: var(--muted); }
    .btns { display: flex; gap: 6px; align-items: center; }
    .danger { background: #b42318 !important; color: #fff !important; }
    .editor { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; display: grid; gap: 18px; }
    .ed-head { display: flex; justify-content: space-between; align-items: center; }
    .ed-head h2 { margin: 0; font-size: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 14px; }
    .span2 { grid-column: span 2; } .span3 { grid-column: 1 / -1; }
    .toggles { display: flex; flex-wrap: wrap; gap: 14px 28px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 760px) {
      .grid { grid-template-columns: 1fr 1fr; } .span2, .span3 { grid-column: 1 / -1; }
      .row { grid-template-columns: 72px 1fr; } .price, .btns { grid-column: 2; }
    }
  `,
})
export class CarsEditor {
  private api = inject(Api);
  private fleet = inject(Fleet);
  private snack = inject(MatSnackBar);
  protected readonly cars = signal<Car[]>([]);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly confirmDel = signal<string | null>(null);
  protected readonly cats = (Object.keys(CATEGORY_LABELS) as CarCategory[]).map((id) => ({ id, label: CATEGORY_LABELS[id] }));

  protected readonly lang = signal<Lang>('en');
  protected readonly langName = computed(() => LANG_NAMES[this.lang()]);
  /** translated texts for the selected language, by car id */
  private texts: Record<string, CarText> = {};

  constructor() {
    this.load();
    effect(() => {
      const lang = this.lang();
      if (lang === 'en') return;
      this.api.adminContent().then((c) => (this.texts = structuredClone(c.i18n?.[lang]?.cars ?? {}))).catch((e) => this.toast(e.message));
    });
  }

  protected cat(c: CarCategory) { return CATEGORY_LABELS[c]; }

  async load() {
    try { this.cars.set(sortFleet(await this.api.adminCars())); } catch (e) { this.toast((e as Error).message); }
  }

  add() { this.draft.set(blank()); }
  edit(c: Car) {
    const t = this.lang() === 'en' ? {} : (this.texts[c.id] ?? {});
    const features = t.features?.length ? t.features : c.features;
    this.draft.set({ ...structuredClone(c), tagline: t.tagline || c.tagline, bestFor: t.bestFor || c.bestFor, description: t.description || c.description, featuresText: features.join(', ') });
  }

  /** Save the car's texts in the selected language. */
  async saveText() {
    const d = this.draft();
    if (!d?.id) return;
    const map = { ...this.texts, [d.id]: { tagline: d.tagline, bestFor: d.bestFor, description: d.description, features: d.featuresText.split(',').map((f) => f.trim()).filter(Boolean) } };
    this.busy.set(true);
    try {
      this.texts = await this.api.saveTranslation<Record<string, CarText>>('cars', this.lang(), map);
      this.toast(`${d.name} saved (${this.langName()})`);
      this.draft.set(null);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async save() {
    const d = this.draft();
    if (!d) return;
    if (!d.name.trim()) return this.toast('Give the car a name.');
    if (!(d.pricePerDay > 0)) return this.toast('Set a price per day.');
    const { featuresText, ...rest } = d;
    const body = { ...rest, features: featuresText.split(',').map((f) => f.trim()).filter(Boolean) };
    this.busy.set(true);
    try {
      const saved = d.id ? await this.api.saveCar(d.id, body) : await this.api.createCar(body);
      this.toast(d.id ? `${saved.name} saved` : `${saved.name} added`);
      this.draft.set(null);
      await this.load();
      this.fleet.refresh();
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(c: Car) {
    try {
      await this.api.deleteCar(c.id);
      this.toast(`${c.name} deleted`);
      this.confirmDel.set(null);
      await this.load();
      this.fleet.refresh();
    } catch (e) {
      this.toast((e as Error).message);
    }
  }

  private toast(m: string) { this.snack.open(m, 'OK', { duration: 3500 }); }
}
