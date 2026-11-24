import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public pages are rendered on the server on every request (from the live database),
 * so content the admin edits – cars, blog posts, FAQ, About, contact details – is
 * immediately visible to visitors and to Google. Personal pages render in the browser.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'book', renderMode: RenderMode.Client },
  { path: 'my-booking', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
