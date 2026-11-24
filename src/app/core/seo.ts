import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BUSINESS } from '../../shared/business';
import { LANG_OG, LANGS, switchPath } from '../../shared/i18n';
import { I18n } from './i18n';

export interface SeoInput {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** relative (cars/x.jpg, uploads/x.jpg) or absolute image for social previews */
  image?: string;
  type?: 'website' | 'article' | 'product';
  published?: string;
}

/**
 * Everything search engines and social networks read: title, description, canonical,
 * robots, Open Graph, Twitter cards and JSON-LD structured data.
 * Works the same on the server (so Google gets it in the HTML) and in the browser.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private i18n = inject(I18n);

  /** Full address of a page in a language (default: the page's language). */
  url(path: string, lang = this.i18n.lang): string {
    const p = switchPath(path, lang);
    return BUSINESS.siteUrl + p;
  }

  absolute(src?: string): string {
    if (!src) return `${BUSINESS.siteUrl}/og-image.jpg`;
    if (/^https?:\/\//.test(src)) return src;
    if (src.startsWith('data:')) return `${BUSINESS.siteUrl}/og-image.jpg`;
    return `${BUSINESS.siteUrl}/${src.replace(/^\//, '')}`;
  }

  set(o: SeoInput) {
    // texts are written in English; translated here (already-translated text passes through)
    const title = this.i18n.t(o.title);
    const desc = this.i18n.t(o.description);
    const fullTitle = title.includes('Kibabu') ? title : `${title} | ${BUSINESS.name}`;
    const url = this.url(o.path);
    const description = desc.length > 160 ? desc.slice(0, 157).trimEnd() + '…' : desc;
    const image = this.absolute(o.image);

    this.title.setTitle(fullTitle);
    const tags: [string, string, string][] = [
      ['name', 'description', description],
      ['name', 'robots', o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'],
      ['property', 'og:type', o.type ?? 'website'],
      ['property', 'og:site_name', BUSINESS.name],
      ['property', 'og:locale', LANG_OG[this.i18n.lang]],
      ['property', 'og:title', fullTitle],
      ['property', 'og:description', description],
      ['property', 'og:url', url],
      ['property', 'og:image', image],
      ['property', 'og:image:alt', title],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', fullTitle],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', image],
    ];
    for (const [attr, key, content] of tags) this.meta.updateTag({ [attr]: key, content } as Record<string, string>);
    if (o.published) this.meta.updateTag({ property: 'article:published_time', content: o.published });
    else this.meta.removeTag("property='article:published_time'");

    this.link('canonical', url);
    // the same page in the other languages
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
    if (!o.noindex) {
      for (const l of [...LANGS, 'x-default' as const]) {
        const a = this.doc.createElement('link');
        a.setAttribute('rel', 'alternate');
        a.setAttribute('hreflang', l);
        a.setAttribute('href', this.url(o.path, l === 'x-default' ? 'en' : l));
        this.doc.head.appendChild(a);
      }
    }
    this.siteVerification();
    this.business();
    // drop page-specific structured data from the previous page
    for (const id of ['ld-car', 'ld-post', 'ld-faq', 'ld-crumbs']) this.doc.getElementById(id)?.remove();
  }

  /** BreadcrumbList for rich results. */
  breadcrumbs(items: { name: string; path: string }[]) {
    this.jsonLd('ld-crumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: this.i18n.t(it.name), item: this.url(it.path),
      })),
    });
  }

  /** Adds/replaces a JSON-LD block. `<` is escaped so content can never close the script tag. */
  jsonLd(id: string, data: object) {
    let el = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = this.doc.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      this.doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  private link(rel: string, href: string) {
    let link = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** Search Console / Bing Webmaster verification codes from Admin → Settings. */
  private siteVerification() {
    const b = BUSINESS as typeof BUSINESS & { googleVerification?: string; bingVerification?: string };
    if (b.googleVerification) this.meta.updateTag({ name: 'google-site-verification', content: b.googleVerification });
    if (b.bingVerification) this.meta.updateTag({ name: 'msvalidate.01', content: b.bingVerification });
  }

  /** Local business + website schema on every page (from the live settings). */
  private business() {
    const b = BUSINESS;
    const sameAs = [b.facebook, b.instagram, b.tiktok, b.tripadvisor].filter(Boolean);
    this.jsonLd('ld-business', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['AutoRental', 'LocalBusiness'],
          '@id': `${b.siteUrl}/#business`,
          name: b.name,
          url: b.siteUrl,
          logo: `${b.siteUrl}/logo-badge.png`,
          image: `${b.siteUrl}/og-image.jpg`,
          telephone: b.phone.replace(/\s/g, ''),
          email: b.email,
          priceRange: '$25 – $100 per day',
          currenciesAccepted: 'USD',
          paymentAccepted: 'Cash, Credit Card',
          address: { '@type': 'PostalAddress', streetAddress: b.poBox, addressLocality: 'Stone Town', addressRegion: 'Zanzibar', addressCountry: 'TZ' },
          geo: { '@type': 'GeoCoordinates', latitude: -6.1659, longitude: 39.2026 },
          areaServed: { '@type': 'Place', name: 'Zanzibar' },
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '00:00', closes: '23:59',
          },
          ...(sameAs.length ? { sameAs } : {}),
        },
        {
          '@type': 'WebSite',
          '@id': `${b.siteUrl}/#website`,
          url: b.siteUrl,
          name: b.name,
          inLanguage: ['en', 'it', 'ru', 'es', 'de'],
          publisher: { '@id': `${b.siteUrl}/#business` },
        },
      ],
    });
  }
}
