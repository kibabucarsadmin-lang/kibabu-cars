import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

const KEY = 'kb_admin_token';

@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private router = inject(Router);
  readonly token = signal<string | null>(this.read());

  private read(): string | null {
    if (!this.browser) return null;
    try { return sessionStorage.getItem(KEY); } catch { return null; }
  }

  login(token: string) {
    this.token.set(token);
    try { sessionStorage.setItem(KEY, token); } catch { /* storage unavailable */ }
  }

  logout() {
    this.token.set(null);
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    if (this.browser) this.router.navigate(['/admin/login']);
  }
}

export const adminGuard = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  return auth.token() ? true : router.parseUrl('/admin/login');
};
