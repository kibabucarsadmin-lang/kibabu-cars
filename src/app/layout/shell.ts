import { tx } from '../../shared/i18n';
import { Busy } from '../core/busy';
import { Analytics } from '../core/analytics';
import { CarLoader } from '../shared/car-loader';
import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ContentStore } from '../core/content-store';
import { BUSINESS, CATEGORY_LABELS, whatsappLink } from '../../shared/business';
import { CarCategory } from '../../shared/models';
import { DEMO } from '../core/env';
import { Fleet } from '../core/fleet';
import { Logo } from './logo';
import { Flag } from '../shared/flag';
import { I18n, TPipe } from '../core/i18n';
import { Lang, switchPath } from '../../shared/i18n';

type MenuId = 'cars' | 'plan' | 'lang' | null;

@Component({
  selector: 'kb-shell',
  imports: [TPipe, Flag, A11yModule, RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, Logo, CarLoader],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private router = inject(Router);
  protected readonly busy = inject(Busy);
  protected readonly analytics = inject(Analytics);
  private doc = inject(DOCUMENT);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly fleet = inject(Fleet);
  protected readonly demo = DEMO;
  protected readonly b = BUSINESS;
  protected readonly year = new Date().getFullYear();
  protected readonly tel = 'tel:' + BUSINESS.phone.replace(/\s/g, '');
  protected readonly wa = whatsappLink('Hello Kibabu Cars, I would like to rent a car in Zanzibar.');

  protected readonly menuOpen = signal(false);
  protected readonly dropdown = signal<MenuId>(null);
  protected readonly scrolled = signal(false);
  protected readonly hidden = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastY = 0;

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map((e) => e.urlAfterRedirects)),
    { initialValue: this.router.url },
  );
  protected readonly isAdmin = computed(() => this.url().startsWith('/admin'));
  protected readonly isBooking = computed(() => this.url().startsWith('/book'));
  protected readonly inCars = computed(() => this.url().startsWith('/fleet'));
  protected readonly inPlan = computed(() => /^\/(faq|blog)/.test(this.url()));

  protected readonly types = (Object.keys(CATEGORY_LABELS) as CarCategory[]).map((id) => ({
    id, label: CATEGORY_LABELS[id],
    hint: { compact: tx('Easy to park, lowest prices'), suv: tx('For beach tracks and villages'), family: tx('Room for luggage and kids'), premium: tx('Comfort for long drives') }[id],
  }));
  protected readonly menuCars = computed(() => this.fleet.featured().slice(0, 4));
  protected readonly planLinks = computed(() => [
    { path: '/faq', fragment: 'permit', icon: 'badge', title: tx('Zanzibar driving permit'), text: tx('What it is and how we arrange it') },
    { path: '/faq', fragment: undefined, icon: 'quiz', title: tx('Questions and answers'), text: tx('Payment, insurance, delivery, fuel') },
    { path: '/blog', fragment: undefined, icon: 'auto_stories', title: tx('Travel blog'), text: tx('Road trips and driving tips') },
    { path: '/my-booking', fragment: undefined, icon: 'confirmation_number', title: tx('Find my booking'), text: tx('Check or cancel a reservation') },
  ]);
  protected readonly latestPost = inject(ContentStore).latestPost;

  /* ---------- language ---------- */
  protected readonly i18n = inject(I18n);
  protected readonly langs = this.i18n.langs;
  protected readonly langName = this.langs.find((l) => l.id === this.i18n.lang)!.name;
  /** the same page in another language (full page load, so Google sees separate pages) */
  protected langHref(l: Lang): string {
    if (DEMO) return '#' + this.url();
    return switchPath(this.url().split('#')[0], l);
  }
  protected pickLang(l: Lang, e: Event) {
    if (!DEMO || !this.browser) return; // normal site: the link does it
    e.preventDefault();
    try { localStorage.setItem('kb_lang', l); } catch { /* private mode */ }
    location.reload();
  }

  constructor() {
    effect(() => {
      this.url();
      this.menuOpen.set(false);
      this.dropdown.set(null);
    });
    // lock page scroll while the mobile menu is open
    effect(() => {
      if (!this.browser) return;
      const open = this.menuOpen();
      const root = this.doc.documentElement;
      root.style.overflow = open ? 'hidden' : '';
      // start the menu right under the header, wherever it sits (e.g. below the demo notice)
      if (open) {
        const header = this.doc.querySelector<HTMLElement>('.header');
        // if the header is sliding back in, its resting place is the top of the screen
        const bottom = header ? Math.max(header.getBoundingClientRect().bottom, header.offsetHeight) : 0;
        root.style.setProperty('--sheet-top', `${Math.max(0, Math.round(bottom))}px`);
      }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    const y = window.scrollY;
    this.scrolled.set(y > 8);
    // hide the header when scrolling down, show it again on the way up
    if (!this.dropdown() && Math.abs(y - this.lastY) > 6) this.hidden.set(y > this.lastY && y > 320);
    this.lastY = y;
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.menuOpen.set(false);
    this.dropdown.set(null);
  }

  protected openMenu(id: MenuId) {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.dropdown.set(id);
  }
  protected closeSoon() {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.dropdown.set(null), 160);
  }
  protected toggle(id: MenuId) {
    this.dropdown.set(this.dropdown() === id ? null : id);
  }
}
