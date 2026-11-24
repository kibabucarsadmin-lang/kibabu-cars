import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Addons, AddonText, ExtraService, InsuranceOption } from '../../../shared/business';
import { Dict, LANG_NAMES, Lang, loadDict } from '../../../shared/i18n';
import { Api } from '../../core/api';
import { ContentStore } from '../../core/content-store';
import { LangBar } from './lang-bar';

const ICONS: { id: string; name: string }[] = [
  { id: 'add_circle', name: 'Extra' }, { id: 'badge', name: 'Permit' }, { id: 'kitchen', name: 'Cooler box' },
  { id: 'person_pin', name: 'Driver' }, { id: 'sim_card', name: 'SIM card' }, { id: 'wifi', name: 'Wi-Fi' },
  { id: 'child_care', name: 'Child' }, { id: 'beach_access', name: 'Beach' }, { id: 'scuba_diving', name: 'Snorkel' }, { id: 'surfing', name: 'Surf' }, { id: 'kayaking', name: 'Kayak' }, { id: 'restaurant', name: 'Food' }, { id: 'hiking', name: 'Tour' },
  { id: 'luggage', name: 'Luggage' }, { id: 'local_gas_station', name: 'Fuel' }, { id: 'flight', name: 'Airport' },
  { id: 'map', name: 'Map' }, { id: 'camera_alt', name: 'Camera' }, { id: 'umbrella', name: 'Umbrella' },
  { id: 'directions_car', name: 'Car' }, { id: 'local_shipping', name: 'Delivery' }, { id: 'shield', name: 'Protection' },
];
const DEFAULT_ICONS: Record<string, string> = { permit: 'badge', cooler: 'kitchen', chauffeur: 'person_pin', sim: 'sim_card' };

/** Admin → Extras & prices: extra services, damage protection and the additional-driver price. */
@Component({
  selector: 'kb-addons-editor',
  imports: [FormsModule, LangBar, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <kb-lang-bar [(lang)]="lang" />

    @if (data(); as d) {
      <div class="bar">
        @if (en()) {
          <p class="muted">What guests can add in step 2 of the booking. Prices are in US dollars and are added to the total straight away.</p>
        } @else {
          <p class="muted">Grey text is the translation the website uses now. Type over it only if you want different wording.</p>
        }
        <button mat-flat-button class="btn-brass" (click)="save()" [disabled]="busy() || !dirty()">{{ dirty() ? 'Save changes' : 'Saved' }}</button>
      </div>

      <!-- Extra services -->
      <section class="group">
        <header>
          <div><h3>Extra services</h3><p class="muted small">Shown as tick boxes. "Required" ones are always added and can't be removed by the guest.</p></div>
          @if (en()) { <button mat-stroked-button (click)="addExtra()"><mat-icon>add</mat-icon> Add service</button> }
        </header>

        @for (x of d.extras; track x; let i = $index) {
          <article class="item" [class.off]="x.active === false">
            @if (en()) {
              <button class="ic" type="button" [matMenuTriggerFor]="iconMenu" matTooltip="Change icon" aria-label="Change icon"><mat-icon>{{ iconOf(x) }}</mat-icon></button>
              <mat-menu #iconMenu="matMenu" class="kb-icon-menu">
                <div class="icon-grid">
                  @for (ic of icons; track ic.id) {
                    <button type="button" class="pick" [class.on]="iconOf(x) === ic.id" (click)="x.icon = ic.id; touch()" [matTooltip]="ic.name"><mat-icon>{{ ic.id }}</mat-icon></button>
                  }
                </div>
              </mat-menu>
              <div class="fields">
                <div class="line1">
                  <mat-form-field class="name" subscriptSizing="dynamic"><mat-label>Name</mat-label><input matInput [(ngModel)]="x.label" (ngModelChange)="touch()" maxlength="80" /></mat-form-field>
                  <mat-form-field class="price" subscriptSizing="dynamic"><mat-label>Price</mat-label><span matTextPrefix>$&nbsp;</span><input matInput type="number" min="0" step="1" [(ngModel)]="x.price" (ngModelChange)="touch()" /></mat-form-field>
                  <mat-form-field class="per" subscriptSizing="dynamic">
                    <mat-label>Charged</mat-label>
                    <mat-select [(ngModel)]="x.per" (ngModelChange)="touch()"><mat-option value="booking">once per booking</mat-option><mat-option value="day">per day</mat-option></mat-select>
                  </mat-form-field>
                </div>
                <mat-form-field subscriptSizing="dynamic"><mat-label>Short description</mat-label><input matInput [(ngModel)]="x.hint" (ngModelChange)="touch()" maxlength="160" placeholder="One line that helps the guest decide" /></mat-form-field>
                <div class="toggles">
                  <mat-slide-toggle [(ngModel)]="x.locked" (ngModelChange)="touch()">Required</mat-slide-toggle>
                  <mat-slide-toggle [ngModel]="x.active !== false" (ngModelChange)="x.active = $event; touch()">Show on website</mat-slide-toggle>
                  <span class="sample">{{ sample(x) }}</span>
                </div>
              </div>
              <div class="acts">
                <button mat-icon-button (click)="move(d.extras, i, -1)" [disabled]="i === 0" aria-label="Move up"><mat-icon>arrow_upward</mat-icon></button>
                <button mat-icon-button (click)="move(d.extras, i, 1)" [disabled]="i === d.extras.length - 1" aria-label="Move down"><mat-icon>arrow_downward</mat-icon></button>
                <button mat-icon-button (click)="remove(d.extras, i)" matTooltip="Delete" aria-label="Delete service"><mat-icon>delete</mat-icon></button>
              </div>
            } @else {
              <span class="ic static"><mat-icon>{{ iconOf(x) }}</mat-icon></span>
              <div class="fields">
                <p class="orig"><strong>{{ x.label }}</strong>@if (x.hint) { <span class="muted"> · {{ x.hint }}</span> }</p>
                <mat-form-field subscriptSizing="dynamic" floatLabel="always"><mat-label>Name in {{ langName() }}</mat-label><input matInput [ngModel]="tr(x).label" (ngModelChange)="setTr(x, 'label', $event)" [placeholder]="builtIn(x.label)" maxlength="80" /></mat-form-field>
                @if (x.hint) {
                  <mat-form-field subscriptSizing="dynamic" floatLabel="always"><mat-label>Description in {{ langName() }}</mat-label><input matInput [ngModel]="tr(x).hint" (ngModelChange)="setTr(x, 'hint', $event)" [placeholder]="builtIn(x.hint)" maxlength="160" /></mat-form-field>
                }
              </div>
            }
          </article>
        } @empty {
          <p class="empty muted">No extra services. Add one to offer it on the booking form.</p>
        }
      </section>

      @if (en()) {
        <section class="group">
          <header><div><h3>Additional drivers</h3><p class="muted small">Price for each driver after the first. Set 0 to make extra drivers free.</p></div></header>
          <mat-form-field class="fee" subscriptSizing="dynamic"><mat-label>Price per additional driver</mat-label><span matTextPrefix>$&nbsp;</span><input matInput type="number" min="0" step="1" [(ngModel)]="d.extraDriverFee" (ngModelChange)="touch()" /><span matTextSuffix>per booking</span></mat-form-field>
        </section>
      }
      <p class="muted small foot">Changes apply to new bookings only. Bookings already made keep the prices they were made with.</p>
    }
  `,
  styles: `
    :host { display: block; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .bar p { margin: 0; max-width: 60ch; }
    .small { font-size: .85rem; }
    .group { margin-top: 22px; }
    .group header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .group h3 { margin: 0; font-size: 1.1rem; font-family: var(--sans); font-weight: 800; }
    .group header p { margin: 2px 0 0; }
    .item { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px; border-radius: 14px; background: #fff; box-shadow: 0 0 0 1px var(--line); margin-bottom: 10px; }
    .item.off { background: #f6f8f8; } .item.off .fields { opacity: .65; }
    .ic { width: 44px; height: 44px; border-radius: 12px; border: 0; display: grid; place-items: center; background: var(--shallows); color: var(--sea); cursor: pointer; }
    .ic.static { cursor: default; }
    .fields { display: grid; gap: 10px; }
    .line1 { display: grid; grid-template-columns: minmax(0, 1fr) 120px 180px; gap: 10px; }
    .toggles { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 22px; }
    .sample { margin-left: auto; font-size: .85rem; color: var(--muted); }
    .acts { display: flex; flex-direction: column; }
    .orig { margin: 4px 0 0; }
    .icon-grid { display: grid; grid-template-columns: repeat(6, 40px); gap: 4px; padding: 8px; }
    .pick { width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; cursor: pointer; color: var(--sea); }
    .pick:hover { background: var(--foam); } .pick.on { background: var(--sea); color: #fff; }
    .fee { width: min(360px, 100%); }
    .empty { padding: 16px 0; }
    .foot { margin-top: 18px; }
    @media (max-width: 760px) {
      .item { grid-template-columns: 44px minmax(0, 1fr); }
      .acts { grid-column: 1 / -1; flex-direction: row; justify-content: flex-end; }
      .line1 { grid-template-columns: 1fr 1fr; } .line1 .name { grid-column: 1 / -1; }
      .sample { margin-left: 0; width: 100%; }
    }
  `,
})
export class AddonsEditor {
  private api = inject(Api);
  private store = inject(ContentStore);
  private snack = inject(MatSnackBar);
  protected readonly lang = signal<Lang>('en');
  protected readonly en = computed(() => this.lang() === 'en');
  protected readonly langName = computed(() => LANG_NAMES[this.lang()]);
  protected readonly data = signal<Addons | null>(null);
  protected readonly busy = signal(false);
  protected readonly dirty = signal(false);
  protected readonly icons = ICONS;
  private readonly dict = signal<Dict>({});

  constructor() {
    void this.load();
    effect(() => {
      const l = this.lang();
      void loadDict(l).then((d) => this.dict.set(d));
    });
  }

  private async load() {
    try {
      const c = await this.api.adminContent();
      this.data.set(structuredClone(c.addons ?? { extras: [], insurance: [], extraDriverFee: 0 }));
    } catch { /* the Api shows the error */ }
  }

  protected touch() { this.dirty.set(true); }
  protected iconOf(x: ExtraService) { return x.icon || DEFAULT_ICONS[x.id] || 'add_circle'; }
  protected builtIn(en?: string) { return (en && this.dict()[en]) || en || ''; }
  protected tr(x: ExtraService | InsuranceOption): AddonText { return x.i18n?.[this.lang()] ?? {}; }
  protected setTr(x: ExtraService | InsuranceOption, k: keyof AddonText, v: string) {
    const l = this.lang();
    x.i18n ??= {};
    x.i18n[l] = { ...x.i18n[l], [k]: v };
    this.touch();
  }

  protected sample(x: ExtraService) {
    if (!x.price) return 'Free';
    return x.per === 'day' ? `5-day rental: $${x.price * 5}` : `$${x.price} per booking`;
  }

  protected addExtra() {
    this.data.update((d) => d && { ...d, extras: [...d.extras, { id: '', label: '', hint: '', price: 0, per: 'booking', active: true, icon: 'add_circle' }] });
    this.touch();
    setTimeout(() => document.querySelectorAll<HTMLInputElement>('.group:first-of-type .item .name input')[this.data()!.extras.length - 1]?.focus(), 60);
  }
  protected addInsurance() {
    this.data.update((d) => d && { ...d, insurance: [...d.insurance, { id: '', label: '', hint: '', pricePerDay: 0, active: true }] });
    this.touch();
  }
  protected move<T>(list: T[], i: number, dir: number) {
    const j = i + dir;
    [list[i], list[j]] = [list[j], list[i]];
    this.data.update((d) => d && { ...d });
    this.touch();
  }
  protected remove<T>(list: T[], i: number) {
    if (!confirm('Delete this item? Old bookings keep their prices. To hide it for a while instead, switch off "Show on website".')) return;
    list.splice(i, 1);
    this.data.update((d) => d && { ...d });
    this.touch();
  }

  protected async save() {
    const d = this.data();
    if (!d) return;
    const empty = [...d.extras, ...d.insurance].find((x) => !x.label.trim());
    if (empty) { this.snack.open('Every item needs a name. Fill it in or delete the empty item.', 'OK', { duration: 5000 }); return; }
    this.busy.set(true);
    try {
      const saved = await this.api.saveAddons(d);
      this.data.set(structuredClone(saved));
      this.store.use({ addons: saved });
      this.dirty.set(false);
      this.snack.open('Extras saved. New bookings use them right away.', 'OK', { duration: 3000 });
    } catch { /* shown by Api */ } finally { this.busy.set(false); }
  }
}
