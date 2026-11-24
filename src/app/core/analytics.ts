import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BUSINESS } from '../../shared/business';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; } }

type Choice = 'granted' | 'denied';
const KEY = 'kb_consent';

/**
 * Google Analytics 4 and Google Ads, with cookie consent.
 * Nothing from Google is loaded until the visitor clicks "Accept" (Consent Mode v2 signals are sent as granted then).
 * "Only necessary" keeps Google off. The choice is remembered and can be changed from the footer.
 * IDs come from Admin → Contact & settings; with no IDs there is no banner at all.
 */
@Injectable({ providedIn: 'root' })
export class Analytics {
  private doc = inject(DOCUMENT);
  private router = inject(Router);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private loaded = false;
  private ready = false;

  /** the cookie banner is open */
  readonly banner = signal(false);
  /** GA4 or Google Ads is set up, so a "Cookie settings" link makes sense */
  readonly enabled = signal(false);

  private get ids() {
    const b = BUSINESS as { gaId?: string; adsId?: string; adsLabel?: string };
    return {
      ga: /^G-[A-Z0-9]+$/.test(b.gaId ?? '') ? b.gaId! : '',
      ads: /^AW-\d+$/.test(b.adsId ?? '') ? b.adsId! : '',
      label: /^[A-Za-z0-9_-]+$/.test(b.adsLabel ?? '') ? b.adsLabel! : '',
    };
  }

  private choice(): Choice | null {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      return c?.v === 1 && (c.c === 'granted' || c.c === 'denied') ? c.c : null;
    } catch {
      return null;
    }
  }

  /** Called once the site settings are known. */
  start() {
    if (!this.browser || this.ready) return;
    this.ready = true;
    const { ga, ads } = this.ids;
    if (!ga && !ads) return;
    this.enabled.set(true);
    const c = this.choice();
    if (c === 'granted') this.load();
    else if (!c && !location.pathname.includes('/admin')) this.banner.set(true);
  }

  accept() { this.save('granted'); this.load(); }

  decline() {
    this.save('denied');
    // if Google was already running (they accepted before), stop it storing anything from now on
    window.gtag?.('consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  }

  /** footer link: show the choice again */
  openSettings() { this.banner.set(true); }

  private save(c: Choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, c, at: new Date().toISOString() })); } catch { /* private mode */ }
    this.banner.set(false);
  }

  private load() {
    if (this.loaded) return;
    const { ga, ads } = this.ids;
    if (!ga && !ads) return;
    this.loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer!.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    window.gtag('js', new Date());
    if (ga) window.gtag('config', ga, { send_page_view: false });
    if (ads) window.gtag('config', ads);
    const s = this.doc.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ga || ads}`;
    this.doc.head.appendChild(s);
    const view = (path: string) => {
      if (path.includes('/admin')) return;
      window.gtag?.('event', 'page_view', { page_path: path, page_title: this.doc.title, page_location: location.href });
    };
    view(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => view(e.urlAfterRedirects));
  }

  /** A completed booking: GA4 "purchase" and, if set, the Google Ads conversion. */
  booking(value: number, ref: string) {
    if (!this.loaded) return;
    window.gtag?.('event', 'purchase', { transaction_id: ref, value, currency: 'USD' });
    const { ads, label } = this.ids;
    if (ads && label) window.gtag?.('event', 'conversion', { send_to: `${ads}/${label}`, value, currency: 'USD', transaction_id: ref });
  }
}
