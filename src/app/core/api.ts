import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import type { Addons } from '../../shared/business';
import type { MissingLink, Redirect } from '../../shared/content';
export interface RedirectData { redirects: Redirect[]; missing: MissingLink[] }
export interface AdminSettings {
  sender: string;
  email: { source: 'admin' | 'env' | 'none'; hint: string; unreadable: boolean; ownerEmail: string; ownerDefault: string; updatedAt: string | null };
  database: { storage: 'mysql' | 'postgres' | 'file' | 'demo'; error: string | null };
}
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AdminStats, Booking, BookingRequest, BookingStatus, Car, ContactMessage,
} from '../../shared/models';
import { AdminAuth } from './admin-auth';
import { AboutContent } from '../../shared/about';
import { BlogPost } from '../../shared/blog';
import { Business, SiteContent } from '../../shared/content';
import { FaqGroup } from '../../shared/faq';

/** Typed wrapper around the /api endpoints in src/server/api.ts */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private auth = inject(AdminAuth);

  private get adminHeaders() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token() ?? ''}` }) };
  }

  private async run<T>(p: Promise<T>): Promise<T> {
    try {
      return await p;
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (err.status === 401) this.auth.logout();
      const msg = err.error?.error || (err.status === 0 ? 'Network problem – check your connection.' : 'Something went wrong.');
      throw new Error(msg);
    }
  }

  cars() { return this.run(firstValueFrom(this.http.get<Car[]>('/api/cars'))); }
  availability(from: string, to: string) {
    return this.run(firstValueFrom(this.http.get<Record<string, number>>('/api/availability', { params: { from, to } })));
  }
  createBooking(req: BookingRequest) { return this.run(firstValueFrom(this.http.post<Booking>('/api/bookings', req))); }
  lookupBooking(ref: string, email: string) {
    return this.run(firstValueFrom(this.http.get<Booking>('/api/bookings/lookup', { params: { ref, email } })));
  }
  cancelBooking(ref: string, email: string) {
    return this.run(firstValueFrom(this.http.post<Booking>('/api/bookings/cancel', { ref, email })));
  }
  contact(body: { name: string; email: string; phone: string; message: string }) {
    return this.run(firstValueFrom(this.http.post<{ ok: boolean }>('/api/contact', body)));
  }

  // admin
  login(password: string) { return this.run(firstValueFrom(this.http.post<{ token: string }>('/api/admin/login', { password }))); }
  stats() { return this.run(firstValueFrom(this.http.get<AdminStats>('/api/admin/stats', this.adminHeaders))); }
  emailGuest(id: string, subject: string, message: string) {
    return this.run(firstValueFrom(this.http.post<{ ok: boolean; to: string }>(`/api/admin/bookings/${id}/email`, { subject, message }, this.adminHeaders)));
  }
  adminBookings() { return this.run(firstValueFrom(this.http.get<Booking[]>('/api/admin/bookings', this.adminHeaders))); }
  updateBooking(id: string, body: { status?: BookingStatus; adminNote?: string }) {
    return this.run(firstValueFrom(this.http.patch<Booking>(`/api/admin/bookings/${id}`, body, this.adminHeaders)));
  }
  adminCars() { return this.run(firstValueFrom(this.http.get<Car[]>('/api/admin/cars', this.adminHeaders))); }
  updateCar(id: string, body: Partial<Car>) {
    return this.run(firstValueFrom(this.http.put<Car>(`/api/admin/cars/${id}`, body, this.adminHeaders)));
  }
  content() { return this.run(firstValueFrom(this.http.get<SiteContent>('/api/content'))); }
  /** Everything, with all translations (admin editors) */
  adminContent() { return this.run(firstValueFrom(this.http.get<SiteContent>('/api/admin/content', this.adminHeaders))); }
  /** Save the translation of about / faq / blog / cars for one language */
  saveTranslation<T>(key: 'about' | 'faq' | 'blog' | 'cars', lang: string, body: unknown) {
    return this.run(firstValueFrom(this.http.put<T>(`/api/admin/content/${key}?lang=${lang}`, body, this.adminHeaders)));
  }
  createCar(body: Partial<Car>) { return this.run(firstValueFrom(this.http.post<Car>('/api/admin/cars', body, this.adminHeaders))); }
  saveCar(id: string, body: Partial<Car>) {
    return this.run(firstValueFrom(this.http.put<Car>(`/api/admin/cars/${id}`, { ...body, full: true }, this.adminHeaders)));
  }
  deleteCar(id: string) { return this.run(firstValueFrom(this.http.delete<{ ok: boolean }>(`/api/admin/cars/${id}`, this.adminHeaders))); }
  upload(dataUrl: string) { return this.run(firstValueFrom(this.http.post<{ url: string }>('/api/admin/upload', { dataUrl }, this.adminHeaders))); }
  redirects() { return this.run(firstValueFrom(this.http.get<RedirectData>('/api/admin/redirects', this.adminHeaders))); }
  saveRedirects(list: Redirect[]) { return this.run(firstValueFrom(this.http.put<RedirectData>('/api/admin/redirects', list, this.adminHeaders))); }
  clearMissing() { return this.run(firstValueFrom(this.http.delete<{ ok: boolean }>('/api/admin/missing', this.adminHeaders))); }
  saveAddons(a: Addons) { return this.run(firstValueFrom(this.http.put<Addons>('/api/admin/content/addons', a, this.adminHeaders))); }
  saveBusiness(b: Business) { return this.run(firstValueFrom(this.http.put<Business>('/api/admin/content/business', b, this.adminHeaders))); }
  saveAbout(a: AboutContent) { return this.run(firstValueFrom(this.http.put<AboutContent>('/api/admin/content/about', a, this.adminHeaders))); }
  saveFaq(f: FaqGroup[]) { return this.run(firstValueFrom(this.http.put<FaqGroup[]>('/api/admin/content/faq', f, this.adminHeaders))); }
  saveBlog(b: BlogPost[]) { return this.run(firstValueFrom(this.http.put<BlogPost[]>('/api/admin/content/blog', b, this.adminHeaders))); }

  settings() { return this.run(firstValueFrom(this.http.get<AdminSettings>('/api/admin/settings', this.adminHeaders))); }
  saveEmailSettings(body: { resendKey?: string; removeKey?: boolean; ownerEmail?: string }) {
    return this.run(firstValueFrom(this.http.put<AdminSettings>('/api/admin/settings/email', body, this.adminHeaders)));
  }
  testEmail(to: string) { return this.run(firstValueFrom(this.http.post<{ ok: boolean }>('/api/admin/settings/test-email', { to }, this.adminHeaders))); }
  emailPreview(kind: 'guest' | 'office') {
    return this.run(firstValueFrom(this.http.get('/api/admin/settings/preview', { ...this.adminHeaders, params: { kind }, responseType: 'text' })));
  }

  messages() { return this.run(firstValueFrom(this.http.get<ContactMessage[]>('/api/admin/messages', this.adminHeaders))); }
  markMessage(id: string, read: boolean) {
    return this.run(firstValueFrom(this.http.patch<ContactMessage>(`/api/admin/messages/${id}`, { read }, this.adminHeaders)));
  }
}
