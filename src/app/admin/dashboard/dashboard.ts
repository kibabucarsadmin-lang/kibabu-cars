import { UsdPipe } from '../../shared/usd.pipe';
import { DatePipe } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { EXTRAS, INSURANCE, LOCATIONS } from '../../../shared/business';
import { LANG_NAMES, isLang } from '../../../shared/i18n';
import { AdminStats, Booking, BookingStatus, Car, ContactMessage, LocationId } from '../../../shared/models';
import { AdminAuth } from '../../core/admin-auth';
import { Api } from '../../core/api';
import { Seo } from '../../core/seo';
import { AboutEditor } from '../cms/about-editor';
import { BlogEditor } from '../cms/blog-editor';
import { CarsEditor } from '../cms/cars-editor';
import { FaqEditor } from '../cms/faq-editor';
import { AddonsEditor } from '../cms/addons-editor';
import { RedirectsEditor } from '../cms/redirects-editor';
import { EmailSettings } from '../cms/email-settings';
import { SettingsEditor } from '../cms/settings-editor';
import { waNumber } from '../../../shared/countries';

type Section = 'overview' | 'bookings' | 'messages' | 'cars' | 'blog' | 'faq' | 'about' | 'addons' | 'redirects' | 'settings' | 'email';
type Filter = BookingStatus | 'all' | 'upcoming';
const DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'kb-dashboard',
  imports: [UsdPipe, 
    DatePipe, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatSlideToggleModule, MatSnackBarModule,
    MatSortModule, MatTableModule, MatTooltipModule,
    CarsEditor, BlogEditor, FaqEditor, AboutEditor, AddonsEditor, RedirectsEditor, SettingsEditor, EmailSettings,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private api = inject(Api);
  private auth = inject(AdminAuth);
  private snack = inject(MatSnackBar);

  protected readonly statuses: BookingStatus[] = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
  protected readonly cols = ['ref', 'customer', 'car', 'pickup', 'return', 'total', 'status', 'actions'];

  protected readonly loading = signal(false);
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly cars = signal<Car[]>([]);
  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly selected = signal<Booking | null>(null);
  protected readonly statusFilter = signal<Filter>('upcoming');

  /* ---------- navigation ---------- */
  protected readonly navOps: { id: Section; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'space_dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'event_note' },
    { id: 'messages', label: 'Messages', icon: 'mail' },
  ];
  protected readonly navSite: { id: Section; label: string; icon: string }[] = [
    { id: 'cars', label: 'Cars & prices', icon: 'directions_car' },
    { id: 'addons', label: 'Extras & add-ons', icon: 'add_shopping_cart' },
    { id: 'blog', label: 'Blog', icon: 'article' },
    { id: 'faq', label: 'FAQ', icon: 'help' },
    { id: 'about', label: 'About page', icon: 'info' },
    { id: 'redirects', label: 'Redirects', icon: 'alt_route' },
    { id: 'settings', label: 'Contact & settings', icon: 'tune' },
    { id: 'email', label: 'Email & database', icon: 'forward_to_inbox' },
  ];
  protected readonly titles: Record<Section, { t: string; d: string }> = {
    overview: { t: 'Overview', d: 'Today, the coming week and the latest bookings.' },
    bookings: { t: 'Bookings', d: 'Every reservation from the website. Click one to see details and act.' },
    messages: { t: 'Messages', d: 'Questions sent from the contact page.' },
    cars: { t: 'Cars & prices', d: 'Add cars, change photos and daily rates, or take a car offline.' },
    blog: { t: 'Blog', d: 'Travel stories and guides. New posts help people find the site on Google.' },
    faq: { t: 'FAQ', d: 'Questions and answers shown on the FAQ page.' },
    about: { t: 'About page', d: 'Your story and what guests can count on.' },
    addons: { t: 'Extras & add-ons', d: 'Extra services and the price for additional drivers.' },
    redirects: { t: 'Redirects', d: 'Send old or mistyped links to the right page, so no visitor ends up on "Page not found".' },
    settings: { t: 'Contact & settings', d: 'Phone, WhatsApp, email, social links and Google settings.' },
    email: { t: 'Email & database', d: 'Connect Resend so guests and you get an email for every booking.' },
  };
  protected readonly filters: { id: Filter; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' }, { id: 'active', label: 'On the road' }, { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' }, { id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'all', label: 'All' },
  ];
  protected readonly section = signal<Section>(this.savedSection());
  protected readonly navOpen = signal(false);
  protected readonly today = new Date();
  protected readonly abs = Math.abs;

  private savedSection(): Section {
    try { return (sessionStorage.getItem('kb_admin_section') as Section) || 'overview'; } catch { return 'overview'; }
  }
  protected go(s: Section) {
    this.section.set(s);
    this.navOpen.set(false);
    try { sessionStorage.setItem('kb_admin_section', s); } catch { /* ignore */ }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }
  protected openBookings(f: Filter) { this.statusFilter.set(f); this.go('bookings'); }
  protected openBooking(b: Booking) { this.open(b); }
  @HostListener('document:keydown.escape') protected onEsc() {
    if (this.selected()) this.selected.set(null);
    else this.navOpen.set(false);
  }

  /* ---------- overview data ---------- */
  /** Not finished yet: pending or confirmed, and the return time has not passed (includes trips whose pickup already passed). */
  private isOpen(b: Booking) {
    return ['pending', 'confirmed'].includes(b.status) && +new Date(b.returnAt) >= Date.now() - DAY / 4;
  }
  /** Shown next to the status so nothing is forgotten. */
  protected attention(b: Booking): string | null {
    const now = Date.now();
    if (['pending', 'confirmed'].includes(b.status) && +new Date(b.pickupAt) < now - 60 * 60 * 1000 && +new Date(b.returnAt) > now) return 'Mark handed over';
    if (['pending', 'confirmed', 'active'].includes(b.status) && +new Date(b.returnAt) < now - 60 * 60 * 1000) return b.status === 'active' ? 'Return overdue' : 'Trip ended, update status';
    return null;
  }
  protected readonly upcoming = computed(() => this.bookings().filter((b) => this.isOpen(b)));
  protected readonly week = computed(() =>
    this.upcoming().filter((b) => +new Date(b.pickupAt) >= Date.now() - DAY / 4 && +new Date(b.pickupAt) < Date.now() + 7 * DAY).sort((a, b) => a.pickupAt.localeCompare(b.pickupAt)));
  protected readonly latest = computed(() => [...this.bookings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6));
  protected readonly fleetSize = computed(() => this.cars().filter((c) => c.active).reduce((n, c) => n + (c.units || 1), 0));
  protected readonly todayItems = computed(() => {
    const d = new Date().toDateString();
    const items: { kind: 'pickup' | 'return'; at: string; b: Booking }[] = [];
    for (const b of this.bookings()) {
      if (b.status === 'cancelled') continue;
      if (new Date(b.pickupAt).toDateString() === d && ['pending', 'confirmed'].includes(b.status)) items.push({ kind: 'pickup', at: b.pickupAt, b });
      if (new Date(b.returnAt).toDateString() === d && ['active', 'confirmed'].includes(b.status)) items.push({ kind: 'return', at: b.returnAt, b });
    }
    return items.sort((a, b) => a.at.localeCompare(b.at));
  });
  protected greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  protected countFor(f: Filter): number {
    if (f === 'all') return this.bookings().length;
    if (f === 'upcoming') return this.upcoming().length;
    return this.bookings().filter((b) => b.status === f).length;
  }
  protected initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }
  protected langName(l: string) { return isLang(l) ? LANG_NAMES[l] : l; }
  protected extrasText(b: Booking) {
    const list = (b.extras ?? []).map((x) => this.extraLabel(x));
    if (b.insurance) list.push(INSURANCE.find((i) => i.id === b.insurance)?.label ?? 'Damage protection');
    if (b.babySeats) list.push(`${b.babySeats} baby seat${b.babySeats > 1 ? 's' : ''}`);
    return list.join(', ');
  }
  protected readonly search = signal('');
  protected note = '';

  protected readonly ds = new MatTableDataSource<Booking>([]);
  private sort = viewChild(MatSort);
  private paginator = viewChild(MatPaginator);

  protected readonly filtered = computed(() => {
    const f = this.statusFilter();
    const q = this.search().trim().toLowerCase();
    return this.bookings().filter((b) => {
      if (f === 'upcoming') {
        if (!this.isOpen(b)) return false;
      } else if (f !== 'all' && b.status !== f) return false;
      if (!q) return true;
      return [b.ref, b.customer.name, b.customer.email, b.customer.phone, b.carName].join(' ').toLowerCase().includes(q);
    });
  });

  protected readonly todayPickups = computed(() => {
    const d = new Date().toDateString();
    return this.bookings()
      .filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.pickupAt).toDateString() === d)
      .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  });

  constructor() {
    inject(Seo).set({ title: 'Dashboard', description: 'Admin', path: '/admin', noindex: true });
    this.ds.sortingDataAccessor = (b, col) => {
      switch (col) {
        case 'customer': return b.customer.name.toLowerCase();
        case 'car': return b.carName;
        case 'pickup': return b.pickupAt;
        case 'return': return b.returnAt;
        case 'total': return b.quote.total;
        default: return (b as unknown as Record<string, string>)[col] ?? '';
      }
    };
    effect(() => {
      this.ds.data = this.filtered();
      const s = this.sort(); const p = this.paginator();
      if (s && this.ds.sort !== s) this.ds.sort = s;
      if (p && this.ds.paginator !== p) this.ds.paginator = p;
    });
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const [stats, bookings, cars, messages] = await Promise.all([
        this.api.stats(), this.api.adminBookings(), this.api.adminCars(), this.api.messages(),
      ]);
      this.stats.set(stats);
      this.bookings.set(bookings);
      this.cars.set(cars);
      this.messages.set(messages);
      const sel = this.selected();
      if (sel) this.selected.set(bookings.find((b) => b.id === sel.id) ?? null);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected open(b: Booking) {
    this.selected.set(b);
    this.composing.set(false);
    this.note = b.adminNote ?? '';
  }

  async setStatus(b: Booking, status: BookingStatus) {
    try {
      const updated = await this.api.updateBooking(b.id, { status });
      this.replace(updated);
      this.toast(`${b.ref} marked ${status}`);
      this.stats.set(await this.api.stats());
    } catch (e) { this.toast((e as Error).message); }
  }

  async saveNote(b: Booking) {
    try {
      this.replace(await this.api.updateBooking(b.id, { adminNote: this.note }));
      this.toast('Note saved');
    } catch (e) { this.toast((e as Error).message); }
  }

  async toggleRead(m: ContactMessage) {
    try {
      const u = await this.api.markMessage(m.id, !m.read);
      this.messages.update((l) => l.map((x) => (x.id === u.id ? u : x)));
      this.stats.set(await this.api.stats());
    } catch (e) { this.toast((e as Error).message); }
  }

  protected logout() { this.auth.logout(); }

  protected extraLabel(id: string) { return EXTRAS.find((e) => e.id === id)?.label ?? id; }

  protected loc(id: LocationId) { return LOCATIONS.find((l) => l.id === id)?.label ?? id; }

  protected wa(phone: string, text: string, country = '') {
    return `https://wa.me/${waNumber(phone, country)}?text=${encodeURIComponent(text)}`;
  }

  /** the confirmation text, used for WhatsApp and as the start of an email */
  protected confirmText(b: Booking, emoji = true) {
    const fmt = (s: string) => new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Dar_es_Salaam' });
    return `Hello ${b.customer.name.split(' ')[0]}, this is Kibabu Cars Zanzibar${emoji ? ' 🚗' : ''}\n` +
      `Your booking ${b.ref} is CONFIRMED:\n${b.carName}\nPickup: ${fmt(b.pickupAt)} – ${this.loc(b.pickupLocation)}\n` +
      `Return: ${fmt(b.returnAt)} – ${this.loc(b.returnLocation)}\nTotal: $${b.quote.total}\n${b.paymentMethod === 'online' ? 'Payment: pay now – we will send you a payment link.' : 'Payment: in cash or by card when you get the car'}\n` +
      `\nFor your Zanzibar driving permit please send: driving licence, passport copy and a passport photo for each driver.\n` +
      `\nKaribu Zanzibar!`;
  }

  protected confirmMsg(b: Booking) { return this.wa(b.customer.phone, this.confirmText(b), b.customer.country); }

  /* ---------- email to the guest, sent from info@kibabucars.com ---------- */
  protected readonly composing = signal(false);
  protected readonly sending = signal(false);
  protected mailSubject = '';
  protected mailBody = '';

  protected startEmail(b: Booking) {
    this.mailSubject = `Your Kibabu Cars booking ${b.ref} is confirmed`;
    this.mailBody = this.confirmText(b, false);
    this.composing.set(true);
  }

  async sendEmail(b: Booking) {
    if (!this.mailSubject.trim() || !this.mailBody.trim()) return;
    this.sending.set(true);
    try {
      const r = await this.api.emailGuest(b.id, this.mailSubject, this.mailBody);
      this.toast(`Email sent to ${r.to} from info@kibabucars.com`);
      this.composing.set(false);
    } catch (e) { this.toast((e as Error).message); }
    finally { this.sending.set(false); }
  }

  protected exportCsv() {
    const rows = [
      ['Ref', 'Status', 'Name', 'Email', 'Phone', 'Country', 'Car', 'Pickup', 'Pickup location', 'Return', 'Return location', 'Flight / hotel', 'Passport', 'Days', 'Total USD', 'Payment', 'Drivers', 'Baby seats', 'Created'],
      ...this.filtered().map((b) => [
        b.ref, b.status, b.customer.name, b.customer.email, b.customer.phone, b.customer.country, b.carName,
        b.pickupAt, this.loc(b.pickupLocation), b.returnAt, this.loc(b.returnLocation), b.pickupDetails ?? '', b.passportNumber ?? '',
        b.quote.days, b.quote.total, b.paymentMethod === 'online' ? 'Pay now' : 'At pickup', b.drivers, b.babySeats, b.createdAt,
      ]),
    ];
    // a cell starting with = + - @ would run as a formula in Excel (CSV injection), so it is prefixed with '
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `kibabu-bookings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  private replace(b: Booking) {
    this.bookings.update((l) => l.map((x) => (x.id === b.id ? b : x)));
    if (this.selected()?.id === b.id) this.selected.set(b);
  }

  private toast(msg: string) { this.snack.open(msg, 'OK', { duration: 3000 }); }
}
