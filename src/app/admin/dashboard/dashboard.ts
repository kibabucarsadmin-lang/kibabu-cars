import { UsdPipe } from '../../shared/usd.pipe';
import { DatePipe } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
type Filter = 'action' | 'next' | 'out' | 'done' | 'cancelled' | 'all';
type Tone = 'warn' | 'new' | 'soon' | 'out' | 'done' | 'off';
/** What a booking needs, in plain words: where it is, and the one thing to do next. */
interface BookingInfo {
  stage: Exclude<Filter, 'all'>;
  label: string;
  tone: Tone;
  next?: { label: string; icon: string; status: BookingStatus };
}
const DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'kb-dashboard',
  imports: [UsdPipe, 
    DatePipe, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatMenuModule, MatProgressBarModule, MatSlideToggleModule, MatSnackBarModule,
    MatTooltipModule,
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

  protected readonly loading = signal(false);
  protected readonly stats = signal<AdminStats | null>(null);
  /** everything from the server, deleted ones included */
  protected readonly allBookings = signal<Booking[]>([]);
  /** what the rest of the admin works with: deleted bookings left out */
  protected readonly bookings = computed(() => this.allBookings().filter((b) => !b.deletedAt));
  protected readonly cars = signal<Car[]>([]);
  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly selected = signal<Booking | null>(null);
  protected readonly statusFilter = signal<Filter>('next');

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
  protected readonly filters: { id: Filter; label: string; hint: string }[] = [
    { id: 'action', label: 'Needs action', hint: 'Pickup or return time has passed and the booking was not updated' },
    { id: 'next', label: 'Coming up', hint: 'Waiting for pickup' },
    { id: 'out', label: 'Out now', hint: 'The guest has the car' },
    { id: 'done', label: 'Finished', hint: 'Car returned' },
    { id: 'cancelled', label: 'Cancelled', hint: '' },
    { id: 'all', label: 'All', hint: '' },
  ];
  protected readonly statusNames: Record<BookingStatus, string> = {
    pending: 'New (not confirmed)', confirmed: 'Confirmed, waiting for pickup', active: 'Out now (guest has the car)', completed: 'Finished (car returned)', cancelled: 'Cancelled',
  };
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
  private picked = false;
  protected pick(f: Filter) { this.picked = true; this.statusFilter.set(f); }
  protected openBookings(f: Filter) { this.pick(f); this.go('bookings'); }
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
  /** One plain-language state per booking, and the next step to take. */
  protected info(b: Booking): BookingInfo {
    const now = Date.now(), hour = 60 * 60 * 1000;
    const pick = +new Date(b.pickupAt), ret = +new Date(b.returnAt);
    if (b.status === 'cancelled') return { stage: 'cancelled', label: 'Cancelled', tone: 'off' };
    if (b.status === 'completed') return { stage: 'done', label: 'Finished – car returned', tone: 'done' };
    if (b.status === 'active') {
      if (ret < now - hour) return { stage: 'action', label: `Return overdue (${this.ago(b.returnAt)})`, tone: 'warn', next: { label: 'Car returned', icon: 'assignment_turned_in', status: 'completed' } };
      return { stage: 'out', label: `Out now – returns ${this.when(b.returnAt)}`, tone: 'out', next: { label: 'Car returned', icon: 'assignment_turned_in', status: 'completed' } };
    }
    // pending or confirmed: the car has not gone out yet
    if (ret < now - hour) return { stage: 'action', label: 'Trip dates are over – update it', tone: 'warn', next: { label: 'Mark finished', icon: 'assignment_turned_in', status: 'completed' } };
    if (pick < now - hour) return { stage: 'action', label: `Pickup was ${this.ago(b.pickupAt)} – did the car go out?`, tone: 'warn', next: { label: 'Car handed over', icon: 'key', status: 'active' } };
    if (b.status === 'pending') return { stage: 'next', label: 'New – please confirm', tone: 'new', next: { label: 'Confirm', icon: 'check', status: 'confirmed' } };
    return { stage: 'next', label: `Pickup ${this.when(b.pickupAt)}`, tone: this.daysFromToday(b.pickupAt) <= 1 ? 'soon' : 'new', next: { label: 'Car handed over', icon: 'key', status: 'active' } };
  }
  /** calendar days from today (0 = today, 1 = tomorrow, -1 = yesterday) */
  private daysFromToday(iso: string) {
    const d = new Date(iso); const t = new Date();
    return Math.round((+new Date(d.getFullYear(), d.getMonth(), d.getDate()) - +new Date(t.getFullYear(), t.getMonth(), t.getDate())) / DAY);
  }
  private time(iso: string) { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  /** "today at 12:00", "tomorrow at 09:30", "in 4 days (Mon 30 Nov)" */
  protected when(iso: string) {
    const n = this.daysFromToday(iso);
    if (n === 0) return `today at ${this.time(iso)}`;
    if (n === 1) return `tomorrow at ${this.time(iso)}`;
    return `in ${n} days`;
  }
  /** "2 hours ago", "yesterday", "5 days ago" */
  private ago(iso: string) {
    const n = -this.daysFromToday(iso);
    if (n <= 0) { const h = Math.max(1, Math.round((Date.now() - +new Date(iso)) / 3600000)); return `${h} hour${h > 1 ? 's' : ''} ago`; }
    return n === 1 ? 'yesterday' : `${n} days ago`;
  }
  /** the date that matters for the row: return date while the car is out, otherwise pickup */
  protected keyDate(b: Booking) { return this.info(b).stage === 'out' ? b.returnAt : b.pickupAt; }
  protected dayLabel(iso: string) {
    const n = this.daysFromToday(iso);
    const d = new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return n === 0 ? `Today · ${d}` : n === 1 ? `Tomorrow · ${d}` : n === -1 ? `Yesterday · ${d}` : d;
  }
  protected payText(b: Booking) { return b.paymentMethod === 'online' ? 'Pay now (online)' : 'Pays at pickup'; }
  /** short text for the overview lists */
  protected attention(b: Booking): string | null {
    const i = this.info(b);
    return i.stage === 'action' ? i.label : null;
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
    return this.bookings().filter((b) => this.info(b).stage === f).length;
  }
  /** a calm colour per guest, the same every time for the same name */
  protected avatarColor(name: string) {
    const palette = ['#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#b45309', '#15803d', '#0e7490', '#9333ea'];
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
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

  protected readonly limit = signal(50);

  /** show deleted bookings instead of the normal list */
  protected readonly showDeleted = signal(false);
  protected readonly deletedCount = computed(() => this.allBookings().filter((b) => b.deletedAt).length);

  /** every booking, newest booking first (booked today on top, then yesterday…) */
  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const del = this.showDeleted();
    return this.allBookings()
      .filter((b) => !!b.deletedAt === del)
      .filter((b) => !q || [b.ref, b.customer.name, b.customer.email, b.customer.phone, b.carName].join(' ').toLowerCase().includes(q))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  });

  protected readonly todayPickups = computed(() => {
    const d = new Date().toDateString();
    return this.bookings()
      .filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.pickupAt).toDateString() === d)
      .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  });

  constructor() {
    inject(Seo).set({ title: 'Dashboard', description: 'Admin', path: '/admin', noindex: true });
    effect(() => { this.search(); this.limit.set(50); }); // back to the first 50 when the search changes
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const [stats, bookings, cars, messages] = await Promise.all([
        this.api.stats(), this.api.adminBookings(), this.api.adminCars(), this.api.messages(),
      ]);
      this.stats.set(stats);
      this.allBookings.set(bookings);
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
      this.toast(`${b.ref}: ${this.statusNames[status]}`);
      this.stats.set(await this.api.stats());
    } catch (e) { this.toast((e as Error).message); }
  }

  async deleteBooking(b: Booking) {
    if (typeof window !== 'undefined' && !window.confirm(`Delete booking ${b.ref} (${b.customer.name})?\n\nIt is hidden from the list and the car becomes free again. You can restore it from "Deleted".`)) return;
    try {
      this.replace(await this.api.updateBooking(b.id, { deleted: true }));
      this.selected.set(null);
      this.toast(`${b.ref} deleted`);
      this.stats.set(await this.api.stats());
    } catch (e) { this.toast((e as Error).message); }
  }

  async restoreBooking(b: Booking) {
    try {
      this.replace(await this.api.updateBooking(b.id, { deleted: false }));
      this.toast(`${b.ref} restored`);
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
    this.allBookings.update((l) => l.map((x) => (x.id === b.id ? b : x)));
    if (this.selected()?.id === b.id) this.selected.set(b);
  }

  private toast(msg: string) { this.snack.open(msg, 'OK', { duration: 3000 }); }
}
