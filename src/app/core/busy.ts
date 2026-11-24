import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { finalize } from 'rxjs';

/**
 * Tracks "something is happening": page changes and calls to our API.
 * The top road with the little car (see Shell) shows while `active()` is true.
 * It waits 150 ms before showing (quick actions don't flicker) and stays at least 500 ms once shown.
 */
@Injectable({ providedIn: 'root' })
export class Busy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private count = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;
  readonly active = signal(false);

  constructor() {
    if (!this.browser) return;
    inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationStart) this.start();
      else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) this.stop();
    });
  }

  start() {
    if (!this.browser) return;
    this.count++;
    if (this.active() || this.showTimer) return;
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.count > 0) { this.active.set(true); this.shownAt = Date.now(); }
    }, 150);
  }

  stop() {
    if (!this.browser) return;
    this.count = Math.max(0, this.count - 1);
    if (this.count > 0) return;
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    const wait = Math.max(0, 500 - (Date.now() - this.shownAt));
    setTimeout(() => { if (this.count === 0) this.active.set(false); }, this.active() ? wait : 0);
  }
}

/** Every call to /api shows the top loader. */
export const busyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) return next(req);
  const busy = inject(Busy);
  busy.start();
  return next(req).pipe(finalize(() => busy.stop()));
};
