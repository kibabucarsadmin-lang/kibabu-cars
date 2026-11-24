import { LangBar } from './lang-bar';
import { LANG_NAMES, Lang } from '../../../shared/i18n';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AboutContent } from '../../../shared/about';
import { Api } from '../../core/api';
import { ContentStore } from '../../core/content-store';

@Component({
  selector: 'kb-about-editor',
  imports: [LangBar, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <kb-lang-bar [(lang)]="lang" />
    @if (a(); as a) {
      <form class="editor" (ngSubmit)="save()">
        <mat-form-field><mat-label>Big title on the photo</mat-label><input matInput name="hero" [(ngModel)]="a.heroTitle" /></mat-form-field>
        <mat-form-field><mat-label>Story heading</mat-label><input matInput name="st" [(ngModel)]="a.storyTitle" /></mat-form-field>
        <mat-form-field>
          <mat-label>Our story</mat-label>
          <textarea matInput rows="10" name="story" [(ngModel)]="storyText"></textarea>
          <mat-hint>Leave an empty line between paragraphs.</mat-hint>
        </mat-form-field>
        <mat-form-field><mat-label>Values heading</mat-label><input matInput name="vt" [(ngModel)]="a.valuesTitle" /></mat-form-field>
        <h3>Values</h3>
        @for (v of a.values; track $index; let i = $index) {
          <div class="val">
            <mat-form-field><mat-label>Title</mat-label><input matInput [name]="'vt' + i" [(ngModel)]="v.t" /></mat-form-field>
            <mat-form-field class="grow"><mat-label>Text</mat-label><input matInput [name]="'vd' + i" [(ngModel)]="v.d" /></mat-form-field>
            <button mat-icon-button type="button" (click)="a.values.splice(i, 1)" aria-label="Remove"><mat-icon>delete</mat-icon></button>
          </div>
        }
        @if (a.values.length < 8) {
          <button mat-stroked-button type="button" (click)="a.values.push({ t: '', d: '' })"><mat-icon>add</mat-icon> Add value</button>
        }
        <p class="muted">The numbers (years, rentals, cars, rating) are edited in Settings.</p>
        <div class="actions"><button mat-flat-button class="btn-brass" [disabled]="busy()">Save About page</button></div>
      </form>
    }
  `,
  styles: `
    .editor { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; display: grid; gap: 12px; max-width: 900px; }
    h3 { margin: 8px 0 0; font-size: 1.15rem; }
    .val { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; align-items: center; }
    .actions { display: flex; justify-content: flex-end; }
    @media (max-width: 700px) { .val { grid-template-columns: 1fr auto; } .val .grow { grid-column: 1; } }
  `,
})
export class AboutEditor {
  private api = inject(Api);
  private store = inject(ContentStore);
  private snack = inject(MatSnackBar);
  protected readonly a = signal<AboutContent | null>(null);
  protected readonly busy = signal(false);
  protected storyText = '';

  protected readonly lang = signal<Lang>('en');

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.a.set(null);
      this.api.adminContent().then((c) => {
        const about = lang === 'en' ? c.about : (c.i18n?.[lang]?.about ?? c.about);
        this.a.set(structuredClone(about));
        this.storyText = about.story.join('\n\n');
      }).catch((e) => this.toast(e.message));
    });
  }

  async save() {
    const a = this.a();
    if (!a) return;
    a.story = this.storyText.split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
    a.values = a.values.filter((v) => v.t.trim());
    this.busy.set(true);
    try {
      if (this.lang() === 'en') {
        const saved = await this.api.saveAbout(a);
        this.store.use({ about: saved });
      } else {
        await this.api.saveTranslation('about', this.lang(), a);
      }
      this.toast(`About page saved (${LANG_NAMES[this.lang()]})`);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  private toast(m: string) { this.snack.open(m, 'OK', { duration: 3500 }); }
}
