import { Injectable, afterNextRender, signal } from '@angular/core';
import { BUSINESS } from '../../shared/business';

/**
 * The business email, shown only once the page runs in the browser.
 *
 * CDNs such as Cloudflare (used by Cloudways) rewrite email addresses in server-rendered HTML
 * ("email obfuscation"). The page Angular receives then differs from what the server sent and
 * hydration stops with error NG0500, which breaks every link and button. Keeping the address
 * out of the server HTML avoids that, and also keeps it away from spam bots.
 */
@Injectable({ providedIn: 'root' })
export class EmailLink {
  /** '' on the server and until the app has started, then the address */
  readonly address = signal('');
  /** null until the app has started, then mailto:… */
  readonly href = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.address.set(BUSINESS.email);
      this.href.set('mailto:' + BUSINESS.email);
    });
  }
}
