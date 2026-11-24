import { Component, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LANG_NAMES, LANGS, Lang } from '../../../shared/i18n';

/** "Editing in: English | Italiano | …" switch shown above the content editors. */
@Component({
  selector: 'kb-lang-bar',
  imports: [MatIconModule],
  template: `
    <div class="lb" role="group" aria-label="Language to edit">
      <mat-icon>translate</mat-icon>
      <span class="lbl">Editing in</span>
      @for (l of langs; track l) {
        <button type="button" [class.on]="lang() === l" [attr.aria-pressed]="lang() === l" (click)="lang.set(l)">{{ names[l] }}</button>
      }
    </div>
    @if (lang() !== 'en') {
      <p class="note">You are editing the <strong>{{ names[lang()] }}</strong> version. Anything left empty shows the English text.</p>
    }
  `,
  styles: `
    .lb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 14px; background: var(--foam); box-shadow: 0 0 0 1px var(--line); margin-bottom: 10px; }
    .lb mat-icon { color: var(--lagoon); }
    .lbl { font-weight: 700; margin-right: 6px; color: var(--muted); font-size: .9rem; }
    button { font: inherit; font-weight: 700; font-size: .9rem; padding: 6px 14px; border-radius: 999px; border: 0; background: #fff; box-shadow: 0 0 0 1px var(--line); color: var(--ink); cursor: pointer; }
    button.on { background: var(--sea); color: #fff; box-shadow: none; }
    .note { margin: 0 0 14px; font-size: .9rem; color: var(--muted); }
  `,
})
export class LangBar {
  readonly lang = model<Lang>('en');
  protected readonly langs = LANGS;
  protected readonly names = LANG_NAMES;
}
