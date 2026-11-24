import { LangBar } from './lang-bar';
import { LANG_NAMES, Lang } from '../../../shared/i18n';
import { localizeContent } from '../../../shared/content';
import { DatePipe, LocationStrategy } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BLOG, BlogBlock, BlogPost } from '../../../shared/blog';
import { slugify } from '../../../shared/content';
import { Api } from '../../core/api';
import { ContentStore } from '../../core/content-store';
import { ImageField } from './image-field';

/** Simple writing format for the post body. */
export function blocksToText(body: BlogBlock[]): string {
  return body.map((b) =>
    b.h ? `## ${b.h}` : b.list ? b.list.map((l) => `- ${l}`).join('\n') : b.tip ? `> ${b.tip}` : b.p ?? '',
  ).join('\n\n');
}
export function textToBlocks(text: string): BlogBlock[] {
  return text.replace(/\r/g, '').split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
    if (chunk.startsWith('## ')) return { h: chunk.slice(3).trim() };
    if (chunk.startsWith('> ')) return { tip: chunk.replace(/^>\s?/gm, '').trim() };
    const lines = chunk.split('\n');
    if (lines.every((l) => /^[-*]\s+/.test(l))) return { list: lines.map((l) => l.replace(/^[-*]\s+/, '').trim()) };
    return { p: chunk.replace(/\n/g, ' ') };
  });
}

interface Draft { original?: string; slug: string; title: string; excerpt: string; date: string; tag: string; cover: string; alt: string; text: string; }

@Component({
  selector: 'kb-blog-editor',
  imports: [LangBar, DatePipe, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ImageField],
  template: `
    <kb-lang-bar [(lang)]="lang" (langChange)="draft.set(null)" />
    @if (draft(); as d) {
      <form class="editor" (ngSubmit)="save()">
        <div class="ed-head">
          <h2>{{ d.original ? 'Edit post' : 'New blog post' }}</h2>
          <button mat-button type="button" (click)="draft.set(null)">Cancel</button>
        </div>
        <mat-form-field><mat-label>Title</mat-label><input matInput name="title" [(ngModel)]="d.title" (ngModelChange)="autoSlug(d)" required /></mat-form-field>
        <div class="grid">
          <mat-form-field><mat-label>Web address</mat-label><span matTextPrefix>/blog/</span><input matInput name="slug" [(ngModel)]="d.slug" [readonly]="lang() !== 'en'" /></mat-form-field>
          <mat-form-field><mat-label>Topic</mat-label><input matInput name="tag" [(ngModel)]="d.tag" placeholder="e.g. Road trips" /></mat-form-field>
          <mat-form-field><mat-label>Date</mat-label><input matInput type="date" name="date" [(ngModel)]="d.date" /></mat-form-field>
        </div>
        <mat-form-field><mat-label>Summary (shown in the blog list and on Google)</mat-label><textarea matInput rows="2" name="excerpt" [(ngModel)]="d.excerpt" maxlength="300"></textarea><mat-hint align="end">{{ d.excerpt.length }}/300</mat-hint></mat-form-field>
        <kb-image-field label="Cover photo" [(value)]="d.cover" />
        <mat-form-field><mat-label>Photo description (for Google and screen readers)</mat-label><input matInput name="alt" [(ngModel)]="d.alt" /></mat-form-field>
        <mat-form-field>
          <mat-label>Post text</mat-label>
          <textarea matInput rows="16" name="text" [(ngModel)]="d.text" class="body"></textarea>
          <mat-hint>Leave an empty line between paragraphs. Start a line with “## ” for a heading, “- ” for a list item, “> ” for a tip box.</mat-hint>
        </mat-form-field>
        <div class="actions">
          <button mat-button type="button" (click)="draft.set(null)">Cancel</button>
          <button mat-flat-button class="btn-brass" [disabled]="busy()">{{ d.original ? 'Save post' : 'Publish post' }}</button>
        </div>
      </form>
    } @else {
      <div class="bar">
        <p class="muted">{{ posts().length }} posts. New posts appear on the blog straight away.</p>
        @if (lang() === 'en') { <button mat-flat-button class="btn-brass" (click)="add()"><mat-icon>add</mat-icon> New post</button> }
      </div>
      <div class="list">
        @for (p of posts(); track p.slug) {
          <div class="row card">
            <div class="thumb">@if (p.cover.src) { <img [src]="p.cover.src" alt="" /> }</div>
            <div class="info"><strong>{{ p.title }}</strong><small class="muted">{{ p.date | date: 'd MMM y' }}, {{ p.tag }}</small></div>
            <div class="btns">
              <a mat-button [href]="link(p.slug)" target="_blank" rel="noopener">View</a>
              <button mat-stroked-button (click)="edit(p)"><mat-icon>edit</mat-icon> Edit</button>
              @if (confirmDel() === p.slug) {
                <button mat-flat-button class="danger" (click)="remove(p.slug)">Delete</button>
                <button mat-button (click)="confirmDel.set(null)">Keep</button>
              } @else {
                @if (lang() === 'en') { <button mat-icon-button (click)="confirmDel.set(p.slug)" aria-label="Delete post"><mat-icon>delete</mat-icon></button> }
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .bar p { margin: 0; }
    .list { display: grid; gap: 8px; }
    .row { display: grid; grid-template-columns: 96px 1fr auto; gap: 14px; align-items: center; padding: 8px 12px 8px 8px; }
    .thumb { aspect-ratio: 3 / 2; border-radius: 6px; overflow: hidden; background: var(--limestone); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .info { display: flex; flex-direction: column; }
    .btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .danger { background: #b42318 !important; color: #fff !important; }
    .editor { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; display: grid; gap: 14px; }
    .ed-head { display: flex; justify-content: space-between; align-items: center; }
    .ed-head h2 { margin: 0; font-size: 1.5rem; }
    .grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; }
    .body { font-family: var(--sans); line-height: 1.6; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } .row { grid-template-columns: 72px 1fr; } .btns { grid-column: 1 / -1; } }
  `,
})
export class BlogEditor {
  private api = inject(Api);
  private store = inject(ContentStore);
  private snack = inject(MatSnackBar);
  protected readonly posts = signal<BlogPost[]>([]);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly confirmDel = signal<string | null>(null);

  protected readonly lang = signal<Lang>('en');

  constructor() { effect(() => this.load(this.lang())); }

  async load(lang: Lang = this.lang()) {
    try {
      const c = await this.api.adminContent();
      const blog = lang === 'en' ? c.blog : localizeContent(c, lang).blog;
      this.posts.set([...blog].sort((a, b) => b.date.localeCompare(a.date)));
    } catch { this.posts.set([...BLOG]); }
  }

  private loc = inject(LocationStrategy);
  protected link(slug: string) { return this.loc.prepareExternalUrl('/blog/' + slug); }

  add() {
    this.draft.set({ slug: '', title: '', excerpt: '', date: new Date().toISOString().slice(0, 10), tag: 'Travel tips', cover: '', alt: '', text: '' });
  }
  edit(p: BlogPost) {
    this.draft.set({ original: p.slug, slug: p.slug, title: p.title, excerpt: p.excerpt, date: p.date, tag: p.tag, cover: p.cover.src, alt: p.cover.alt, text: blocksToText(p.body) });
  }
  autoSlug(d: Draft) { if (!d.original) d.slug = slugify(d.title); }

  async save() {
    const d = this.draft();
    if (!d) return;
    if (!d.title.trim()) return this.toast('Give the post a title.');
    const body = textToBlocks(d.text);
    if (!body.length) return this.toast('Write some text for the post.');
    const words = d.text.split(/\s+/).filter(Boolean).length;
    const post: BlogPost = {
      slug: this.lang() !== 'en' && d.original ? d.original : slugify(d.slug || d.title), title: d.title.trim(), excerpt: d.excerpt.trim() || (body.find((b) => b.p)?.p ?? '').slice(0, 200),
      date: d.date, minutes: Math.max(1, Math.round(words / 200)), tag: d.tag.trim() || 'Travel tips',
      cover: { src: d.cover, alt: d.alt || d.title }, body,
    };
    const list = this.posts().filter((p) => p.slug !== (d.original ?? post.slug));
    if (list.some((p) => p.slug === post.slug)) return this.toast('Another post already uses this web address.');
    await this.persist([post, ...list], d.original ? 'Post saved' : 'Post published');
  }

  async remove(slug: string) {
    this.confirmDel.set(null);
    await this.persist(this.posts().filter((p) => p.slug !== slug), 'Post deleted');
  }

  private async persist(list: BlogPost[], msg: string) {
    this.busy.set(true);
    try {
      if (this.lang() === 'en') {
        const saved = await this.api.saveBlog(list);
        this.posts.set([...saved].sort((a, b) => b.date.localeCompare(a.date)));
        this.store.use({ blog: saved });
      } else {
        await this.api.saveTranslation('blog', this.lang(), list);
        await this.load();
        msg += ` (${LANG_NAMES[this.lang()]})`;
      }
      this.draft.set(null);
      this.toast(msg);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private toast(m: string) { this.snack.open(m, 'OK', { duration: 3500 }); }
}
