import { Routes } from '@angular/router';
import { adminGuard } from './core/admin-auth';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  { path: 'fleet', loadComponent: () => import('./pages/fleet/fleet-page').then((m) => m.FleetPage) },
  { path: 'fleet/:id', loadComponent: () => import('./pages/car-detail/car-detail').then((m) => m.CarDetail) },
  { path: 'book', loadComponent: () => import('./pages/book/book').then((m) => m.Book) },
  { path: 'my-booking', loadComponent: () => import('./pages/my-booking/my-booking').then((m) => m.MyBooking) },
  { path: 'about', loadComponent: () => import('./pages/about/about').then((m) => m.About) },
  { path: 'faq', loadComponent: () => import('./pages/faq/faq').then((m) => m.Faq) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact) },
  { path: 'blog', loadComponent: () => import('./pages/blog/blog-list').then((m) => m.BlogList) },
  { path: 'blog/:slug', loadComponent: () => import('./pages/blog/blog-post').then((m) => m.BlogPost) },
  { path: 'terms', loadComponent: () => import('./pages/terms/terms').then((m) => m.Terms) },
  { path: 'admin/login', loadComponent: () => import('./admin/login/admin-login').then((m) => m.AdminLogin) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/dashboard/dashboard').then((m) => m.Dashboard),
  },
  // old WordPress URLs → new pages (keeps Google rankings)
  { path: 'rental-list', redirectTo: 'fleet' },
  { path: 'car-hire', redirectTo: 'fleet' },
  { path: 'about-us', redirectTo: 'about' },
  { path: 'contact-us', redirectTo: 'contact' },
  { path: 'reviews', redirectTo: 'about' },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
