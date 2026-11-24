import { LangBar } from './lang-bar';
import { LANG_NAMES, Lang } from '../../../shared/i18n';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FaqGroup } from '../../../shared/faq';
import { slugify } from '../../../shared/content';
import { Api } from '../../core/api';
import { ContentStore } from '../../core/content-store';

@Component({
  selector: 'kb-faq-editor',
  imports: [LangBar, FormsModule, MatButtonModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <kb-lang-bar [(lang)]="lang" />
    <div class="bar">
      <p class="muted">Topics and questions shown on the FAQ page. Remember to save.</p>
      <div class="bar-btns">
        <button mat-stroked-button (click)="addGroup()"><mat-icon>create_new_folder</mat-icon> Add topic</button>
        <button mat-flat-button class="btn-brass" (click)="save()" [disabled]="busy()">Save FAQ</button>
      </div>
    </div>
    <mat-accordion multi>
      @for (g of groups(); track $index; let gi = $index) {
        <mat-expansion-panel [expanded]="gi === open()" (opened)="open.set(gi)">
          <mat-expansion-panel-header>
            <mat-panel-title>{{ g.title || 'New topic' }}</mat-panel-title>
            <mat-panel-description>{{ g.items.length }} questions</mat-panel-description>
          </mat-expansion-panel-header>
          <div class="g-head">
            <mat-form-field class="grow"><mat-label>Topic title</mat-label><input matInput [(ngModel)]="g.title" /></mat-form-field>
            <button mat-icon-button (click)="move(groups(), gi, -1)" [disabled]="gi === 0" aria-label="Move topic up"><mat-icon>arrow_upward</mat-icon></button>
            <button mat-icon-button (click)="move(groups(), gi, 1)" [disabled]="gi === groups().length - 1" aria-label="Move topic down"><mat-icon>arrow_downward</mat-icon></button>
            <button mat-icon-button (click)="removeGroup(gi)" aria-label="Delete topic"><mat-icon>delete</mat-icon></button>
          </div>
          @for (it of g.items; track $index; let ii = $index) {
            <div class="item">
              <div class="item-fields">
                <mat-form-field><mat-label>Question</mat-label><input matInput [(ngModel)]="it.q" /></mat-form-field>
                <mat-form-field><mat-label>Answer</mat-label><textarea matInput rows="3" [(ngModel)]="it.a"></textarea></mat-form-field>
              </div>
              <div class="item-btns">
                <button mat-icon-button (click)="move(g.items, ii, -1)" [disabled]="ii === 0" aria-label="Move up"><mat-icon>arrow_upward</mat-icon></button>
                <button mat-icon-button (click)="move(g.items, ii, 1)" [disabled]="ii === g.items.length - 1" aria-label="Move down"><mat-icon>arrow_downward</mat-icon></button>
                <button mat-icon-button (click)="g.items.splice(ii, 1)" aria-label="Delete question"><mat-icon>delete</mat-icon></button>
              </div>
            </div>
          }
          <button mat-stroked-button (click)="g.items.push({ q: '', a: '' })"><mat-icon>add</mat-icon> Add question</button>
        </mat-expansion-panel>
      }
    </mat-accordion>
  `,
  styles: `
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .bar p { margin: 0; } .bar-btns { display: flex; gap: 8px; }
    .g-head { display: flex; align-items: center; gap: 4px; }
    .grow { flex: 1; }
    .item { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 12px 0; border-top: 1px solid var(--line); }
    .item-fields { display: grid; gap: 8px; }
    .item-btns { display: flex; flex-direction: column; }
  `,
})
export class FaqEditor {
  private api = inject(Api);
  private store = inject(ContentStore);
  private snack = inject(MatSnackBar);
  protected readonly groups = signal<FaqGroup[]>([]);
  protected readonly open = signal(0);
  protected readonly busy = signal(false);

  protected readonly lang = signal<Lang>('en');

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.api.adminContent().then((c) => {
        const t = lang === 'en' ? undefined : c.i18n?.[lang]?.faq;
        this.groups.set(structuredClone(t?.length ? t : c.faq));
      }).catch((e) => this.toast(e.message));
    });
  }

  addGroup() {
    this.groups.update((g) => [...g, { id: '', title: '', icon: 'help', items: [{ q: '', a: '' }] }]);
    this.open.set(this.groups().length - 1);
  }
  removeGroup(i: number) { this.groups.update((g) => g.filter((_, x) => x !== i)); }
  move<T>(list: T[], i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.groups.update((g) => [...g]);
  }

  async save() {
    const clean = this.groups()
      .map((g) => ({ ...g, id: g.id || slugify(g.title), items: g.items.filter((i) => i.q.trim() && i.a.trim()) }))
      .filter((g) => g.title.trim());
    this.busy.set(true);
    try {
      if (this.lang() === 'en') {
        const saved = await this.api.saveFaq(clean);
        this.groups.set(structuredClone(saved));
        this.store.use({ faq: saved });
      } else {
        const saved = await this.api.saveTranslation<FaqGroup[]>('faq', this.lang(), clean);
        this.groups.set(structuredClone(saved));
      }
      this.toast(`FAQ saved (${LANG_NAMES[this.lang()]})`);
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  private toast(m: string) { this.snack.open(m, 'OK', { duration: 3500 }); }
}
