import { LANG_LOCALE, tx } from '../../../shared/i18n';
import { CarLoader } from '../../shared/car-loader';
import { UsdPipe } from '../../shared/usd.pipe';
import { DatePipe } from '@angular/common';
import { Component, ElementRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { EXTRAS, INSURANCE, LOCATIONS, RULES, sortFleet, whatsappLink } from '../../../shared/business';
import { COUNTRIES } from '../../../shared/countries';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Booking, BookingRequest, LocationId } from '../../../shared/models';
import { calculateQuote } from '../../../shared/pricing';
import { Api } from '../../core/api';
import { Analytics } from '../../core/analytics';
import { Fleet } from '../../core/fleet';
import { Seo } from '../../core/seo';
import { Photo } from '../../shared/photo';
import { TIME_SLOTS, addDays, combine, fromDateParam } from '../../shared/dates';
import { I18n, TPipe } from '../../core/i18n';

@Component({
  selector: 'kb-book',
  imports: [TPipe, UsdPipe, 
    DatePipe, ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatRadioModule, MatSelectModule, MatSlideToggleModule,
    Photo, MatAutocompleteModule, CarLoader,
  ],
  templateUrl: './book.html',
  styleUrl: './book.scss',
})
export class Book {
  private i18n = inject(I18n);
  private fb = inject(FormBuilder).nonNullable;
  private api = inject(Api);
  private analytics = inject(Analytics);
  protected readonly fleet = inject(Fleet);
  private route = inject(ActivatedRoute);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject(ElementRef<HTMLElement>);

  /* ---------- steps ---------- */
  protected readonly stepIdx = signal(0);
  protected readonly confetti = Array.from({ length: 12 }, (_, i) => i);
  protected readonly placeIcon: Record<string, string> = { airport: 'flight_land', 'stone-town': 'location_city', ferry: 'directions_boat', 'hotel-town': 'hotel', coastal: 'beach_access' };
  protected readonly extraIcon: Record<string, string> = { permit: 'badge', cooler: 'kitchen', chauffeur: 'person_pin', sim: 'sim_card' };
  protected readonly carFilters = [
    { id: 'all', label: tx('All cars') },
    { id: '4x4', label: tx('4x4') },
    { id: 'big', label: tx('7 seats') },
    { id: 'budget', label: tx('Under {price}/day') },
  ] as const;
  protected readonly carFilter = signal<'all' | '4x4' | 'big' | 'budget'>('all');
  protected readonly otherReturn = signal(false);
  /** the return dropdown is shown from the start (switch on) */
  protected readonly showReturn = signal(true);
  protected readonly welcomeBack = signal(false);

  protected readonly locations = LOCATIONS;
  protected readonly times = TIME_SLOTS;
  protected readonly rules = RULES;
  protected readonly today = new Date();
  protected readonly extras = EXTRAS.filter((x) => x.active !== false);
  protected readonly driverOptions = Array.from({ length: RULES.maxExtraDrivers }, (_, i) => i + 1);

  protected readonly trip = this.fb.group({
    start: this.fb.control<Date | null>(null, Validators.required),
    end: this.fb.control<Date | null>(null, Validators.required),
    pickupTime: ['10:00', Validators.required],
    returnTime: ['10:00', Validators.required],
    pickupLocation: this.fb.control<LocationId>('airport'),
    returnLocation: this.fb.control<LocationId>('airport'),
    pickupDetails: [''],
    passportNumber: [''],
  });

  protected readonly carForm = this.fb.group({ carId: ['', Validators.required] });

  protected readonly driver = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d\s()-]{7,}$/)]],
    country: [''],
    extraDrivers: [0],
    extras: this.fb.group(Object.fromEntries(EXTRAS.filter((x) => !x.locked && x.active !== false).map((x) => [x.id, false])) as Record<string, boolean>),
    insurance: this.fb.control<string | null>(null),
    babySeats: [0],
    notes: [''],
    website: [''], // spam trap
  });

  protected readonly paymentMethod = this.fb.control<'arrival' | 'online'>('arrival');

  /** A typed date that could not be read (shown under the dates field). */
  protected badDate() {
    const c = this.trip.controls;
    return c.start.hasError('matDatepickerParse') || c.end.hasError('matDatepickerParse');
  }
  protected readonly dateExample = new Intl.DateTimeFormat(LANG_LOCALE[this.i18n.lang], { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(new Date().getFullYear() + 1, 10, 25));

  private readonly tripV = toSignal(this.trip.valueChanges.pipe(startWith(this.trip.getRawValue())), { initialValue: this.trip.getRawValue() });
  private readonly carV = toSignal(this.carForm.valueChanges.pipe(startWith(this.carForm.getRawValue())), { initialValue: this.carForm.getRawValue() });
  private readonly driverV = toSignal(this.driver.valueChanges.pipe(startWith(this.driver.getRawValue())), { initialValue: this.driver.getRawValue() });

  protected readonly availability = signal<Record<string, number> | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly booking = signal<Booking | null>(null);
  protected readonly sumOpen = signal(false);

  protected readonly selectedCar = computed(() => this.fleet.byId(this.carV().carId ?? ''));

  protected readonly period = computed(() => {
    const t = this.tripV();
    if (!t.start || !t.end || !t.pickupTime || !t.returnTime) return null;
    const pickupAt = combine(t.start, t.pickupTime);
    const returnAt = combine(t.end, t.returnTime);
    if (new Date(returnAt) <= new Date(pickupAt)) return null;
    return { pickupAt, returnAt };
  });

  protected readonly quote = computed(() => {
    const car = this.selectedCar();
    const p = this.period();
    if (!car || !p) return null;
    const t = this.tripV();
    const d = this.driverV();
    return calculateQuote(car, {
      ...p,
      pickupLocation: t.pickupLocation ?? 'airport',
      returnLocation: t.returnLocation ?? 'airport',
      drivers: 1 + (d.extraDrivers ?? 0),
      babySeats: d.babySeats ?? 0,
      extras: this.chosenExtras(d.extras),
      insurance: d.insurance ?? null,
    });
  });

  /** Price of each car for the chosen dates (car selection step). */
  protected readonly sortedCars = computed(() => sortFleet(this.fleet.cars()));
  protected readonly carPrices = computed(() => {
    const p = this.period();
    const out: Record<string, number> = {};
    if (!p) return out;
    for (const c of this.fleet.cars()) {
      out[c.id] = calculateQuote(c, { ...p, pickupLocation: 'airport', returnLocation: 'airport', drivers: 1, needPermit: false, babySeats: 0 }).total;
    }
    return out;
  });

  /** Coastal area fee notice (same wording as the old site). */
  protected readonly coastalFee = computed(() => {
    const t = this.tripV();
    return (t.pickupLocation === 'coastal' ? 20 : 0) + (t.returnLocation === 'coastal' ? 20 : 0);
  });
  protected readonly coastalMsg = computed(() => {
    const t = this.tripV();
    const p = t.pickupLocation === 'coastal', d = t.returnLocation === 'coastal';
    if (p && d) return this.i18n.t('A Coastal Area fee of $40 ($20 Pickup + $20 Drop-off) applies and will be added at Checkout.');
    return p
      ? this.i18n.t('A Coastal Area fee of $20 for Pickup applies and will be added at Checkout.')
      : this.i18n.t('A Coastal Area fee of $20 for Drop-off applies and will be added at Checkout.');
  });

  /** Searchable country list. */
  protected readonly countryMatches = computed(() => {
    const q = (this.driverV().country ?? '').trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 50) : COUNTRIES;
  });

  protected chosenExtras(map: Partial<Record<string, boolean>> | undefined): string[] {
    return Object.entries(map ?? {}).filter(([, v]) => v).map(([k]) => k);
  }

  /** Airport pickup or drop-off: flight and passport fields are shown (optional). */
  protected readonly isAirport = computed(() => this.tripV().pickupLocation === 'airport' || this.tripV().returnLocation === 'airport');
  protected readonly pickupHint = computed(() => (this.isAirport() ? tx('Flight number (optional)') : tx('Hotel or villa name and area')));

  constructor() {
    inject(Seo).set({
      title: tx('Book your car'),
      description: tx('Book a rental car in Zanzibar online in 2 minutes. Pay half now and half when you collect the car.'),
      path: '/book',
      noindex: true,
    });

    const q = this.route.snapshot.queryParamMap;
    const from = fromDateParam(q.get('from'));
    const to = fromDateParam(q.get('to'));
    const loc = q.get('loc') as LocationId | null;
    const car = q.get('car');
    if (from) this.trip.controls.start.setValue(from);
    if (to) this.trip.controls.end.setValue(to);
    else if (from) this.trip.controls.end.setValue(addDays(from, 3));
    if (loc && LOCATIONS.some((l) => l.id === loc)) {
      this.trip.controls.pickupLocation.setValue(loc);
      this.trip.controls.returnLocation.setValue(loc);
    }
    const ret = q.get('ret') as LocationId | null;
    if (ret && LOCATIONS.some((l) => l.id === ret)) {
      this.trip.controls.returnLocation.setValue(ret);
      this.otherReturn.set(ret !== this.trip.controls.pickupLocation.value);
    }
    if (car) this.carForm.controls.carId.setValue(car);
    if (from) this.stepIdx.set(2);

    // remember contact details on this device (like the old site did with the phone number)
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('kb_driver') || 'null');
        if (saved) {
          this.driver.patchValue({ name: saved.name ?? '', email: saved.email ?? '', phone: saved.phone ?? '', country: saved.country ?? '' });
          this.welcomeBack.set(!!saved.name);
        }
      } catch { /* ignore */ }
      this.driver.valueChanges.subscribe((v) => {
        try { localStorage.setItem('kb_driver', JSON.stringify({ name: v.name, email: v.email, phone: v.phone, country: v.country })); } catch { /* ignore */ }
      });
    }

    // the total on screen glides to the new price
    effect(() => {
      const target = this.quote()?.total ?? 0;
      const from = untracked(this.shownTotal);
      if (!this.browser || from === 0 || from === target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.shownTotal.set(target);
        return;
      }
      cancelAnimationFrame(this.raf);
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 450);
        const e = 1 - Math.pow(1 - k, 3);
        this.shownTotal.set(Math.round(from + (target - from) * e));
        if (k < 1) this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });

    // load live availability when the dates change
    effect(() => {
      const p = this.period();
      this.availability.set(null);
      if (!p) return;
      this.api.availability(p.pickupAt, p.returnAt).then((a) => {
        if (this.period() === p) this.availability.set(a);
      }).catch(() => this.availability.set(null));
    });
  }

  protected isAvailable(id: string) {
    const a = this.availability();
    return !a || (a[id] ?? 1) > 0;
  }

  protected selectCar(id: string) {
    if (!this.isAvailable(id)) return;
    this.carForm.controls.carId.setValue(id);
  }

  /* ---------- question navigation ---------- */
  /** 0 place · 1 dates · 2 car · 3 extras · 4 details */
  protected readonly dir = signal(1);
  private readonly datesReady = computed(() => !!this.period() && !!this.tripV() && this.trip.valid);
  private readonly carReady = computed(() => this.datesReady() && !!this.selectedCar() && this.isAvailable(this.carV().carId ?? ''));
  /** Each question can be opened once the ones before it are answered. */
  private answered(i: number) {
    return i === 0 ? true : i === 1 ? this.datesReady() : i === 2 ? this.carReady() : true;
  }
  protected readonly canNext = computed(() => this.answered(this.stepIdx()));
  protected canReach(i: number) {
    for (let k = 0; k < i; k++) if (!this.answered(k)) return false;
    return true;
  }
  protected goTo(i: number) {
    if (i < 0 || i > 4 || !this.canReach(i) || i === this.stepIdx()) return;
    this.dir.set(i > this.stepIdx() ? 1 : -1);
    this.stepIdx.set(i);
    this.sumOpen.set(false);
    if (this.browser) {
      const top = (this.host.nativeElement.querySelector('.main') as HTMLElement | null)?.getBoundingClientRect().top ?? 0;
      if (top < 70 || top > innerHeight * 0.5) window.scrollTo({ top: window.scrollY + top - 90, behavior: this.motion() });
    }
  }
  protected next() {
    if (this.canNext()) this.goTo(this.stepIdx() + 1);
  }
  protected readonly extrasCount = computed(() => this.chosenExtras(this.driverV().extras).length);
  protected readonly nextHint = computed(() => {
    const i = this.stepIdx();
    if (i === 0) return tx('Tap a place to continue');
    if (i === 1 && !this.period()) return tx('Choose your dates');
    if (i === 2 && !this.selectedCar()) return tx('Tap a car to continue');
    return '';
  });
  private motion(): ScrollBehavior {
    return this.browser && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  /* ---------- trip helpers ---------- */
  /** Return follows the pickup place until the guest picks a different return place. */
  protected pickPlace(id: LocationId) {
    this.trip.controls.pickupLocation.setValue(id);
    if (!this.otherReturn()) this.trip.controls.returnLocation.setValue(id);
  }
  protected pickReturn(id: LocationId) {
    this.trip.controls.returnLocation.setValue(id);
    this.otherReturn.set(id !== this.trip.controls.pickupLocation.value);
  }

  /** Extras on the confirmation (what the guest added, with the price charged). */
  protected confirmedExtras(b: Booking): { label: string; amount: number }[] {
    const t = (x: string, p?: Record<string, string | number>) => this.i18n.t(x, p);
    const charged = new Map(b.quote.lines.map((l) => [l.t ?? l.label, l.amount]));
    const out: { label: string; amount: number }[] = [];
    for (const x of EXTRAS) {
      if ((b.extras ?? []).includes(x.id) || (x.locked && charged.has(x.label))) out.push({ label: t(x.label), amount: charged.get(x.label) ?? x.price });
    }
    if (b.drivers > 1) out.push({ label: t('Additional drivers: {n}', { n: b.drivers - 1 }), amount: b.quote.lines.find((l) => (l.t ?? '').startsWith('Additional driver'))?.amount ?? 0 });
    if (b.babySeats > 0) out.push({ label: t('Baby seats: {n}', { n: b.babySeats }), amount: 0 });
    return out;
  }
  /** Whole days between the chosen dates (for the "How long?" chips). */
  protected readonly days = computed(() => {
    const t = this.tripV();
    if (!t.start || !t.end) return 0;
    return Math.round((+t.end - +t.start) / 86_400_000);
  });
  protected readonly budgetPrice = 35;
  protected readonly shownCars = computed(() => {
    const f = this.carFilter();
    return this.sortedCars().filter((c) =>
      f === '4x4' ? c.fourByFour : f === 'big' ? c.seats >= 7 : f === 'budget' ? c.pricePerDay <= this.budgetPrice : true);
  });

  /* ---------- extras helpers ---------- */
  protected toggleExtra(id: string, locked: boolean) {
    if (locked) return;
    const c = this.driver.controls.extras.get(id);
    c?.setValue(!c.value);
  }
  protected bump(field: 'extraDrivers' | 'babySeats', by: number, max: number) {
    const c = this.driver.controls[field];
    c.setValue(Math.min(max, Math.max(0, (c.value ?? 0) + by)));
  }

  /* ---------- live total that counts up/down ---------- */
  protected readonly savings = computed(() => {
    const q = this.quote();
    return q ? q.discountPerDay * q.days : 0;
  });
  protected readonly shownTotal = signal(0);
  private raf = 0;

  protected locLabel(id: LocationId | undefined) {
    return this.i18n.t(this.locEn(id));
  }
  /** English name for the WhatsApp message to the office */
  private locEn(id: LocationId | undefined) {
    return LOCATIONS.find((l) => l.id === id)?.label ?? '';
  }

  protected async submit() {
    this.error.set(null);
    if (this.trip.invalid || this.carForm.invalid || !this.period()) {
      this.stepIdx.set(this.datesReady() ? 2 : 1);
      this.trip.markAllAsTouched();
      return;
    }
    if (this.driver.invalid) {
      this.driver.markAllAsTouched();
      this.error.set(tx('Please complete all required fields.'));
      // take the guest to the first field that needs attention
      if (this.browser) setTimeout(() => (this.host.nativeElement.querySelector('.form input.ng-invalid') as HTMLElement | null)?.scrollIntoView({ behavior: this.motion(), block: 'center' }), 0);
      return;
    }
    const t = this.trip.getRawValue();
    const d = this.driver.getRawValue();
    const req: BookingRequest = {
      carId: this.carForm.getRawValue().carId,
      ...this.period()!,
      pickupLocation: t.pickupLocation,
      returnLocation: t.returnLocation,
      pickupDetails: t.pickupDetails,
      drivers: 1 + d.extraDrivers,
      extras: this.chosenExtras(d.extras),
      insurance: d.insurance,
      needPermit: true,
      passportNumber: t.passportNumber,
      babySeats: d.babySeats,
      customer: { name: d.name, email: d.email, phone: d.phone, country: d.country },
      notes: d.notes,
      paymentMethod: this.paymentMethod.value,
      website: d.website ?? '',
    };
    this.submitting.set(true);
    try {
      const b = await this.api.createBooking(req);
      this.booking.set(b);
      this.analytics.booking(b.quote.total, b.ref);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected waConfirm(b: Booking) {
    const fmt = (s: string) => new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    return whatsappLink(
      `Hello Kibabu Cars! I just booked online (confirmed).\n` +
        `Ref: ${b.ref}\nCar: ${b.carName}\n` +
        `Pickup: ${fmt(b.pickupAt)} – ${this.locEn(b.pickupLocation)}${b.pickupDetails ? ' (' + b.pickupDetails + ')' : ''}\n` +
        `Return: ${fmt(b.returnAt)} – ${this.locEn(b.returnLocation)}\n` +
        `Drivers: ${b.drivers}\n` +
        `Extras: ${this.extrasText(b)}\n` +
        `Total: $${b.quote.total} (pay now $${b.quote.deposit}, at pickup $${b.quote.balance})\nName: ${b.customer.name}\n` +
        `I will send my licence, passport copy and photo for the driving permit.`,
    );
  }

  /** "Zanzibar Driving Permit, Cooler Box, Minor Damage Protection (5 days)" */
  protected extrasText(b: Booking) {
    const ids = new Set(b.extras ?? []);
    const list = EXTRAS.filter((x) => ids.has(x.id) || (x.locked && x.active !== false)).map((x) => x.label);
    const ins = INSURANCE.find((i) => i.id === b.insurance);
    if (ins) list.push(`${ins.label} (${b.quote.days} days)`);
    if (b.babySeats > 0) list.push(`Baby seats × ${b.babySeats}`);
    return list.join(', ');
  }
}
