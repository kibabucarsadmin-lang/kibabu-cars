import { Component, inject, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Api } from '../../core/api';
import { resizeImage } from './image';

/** Photo picker: preview + upload (resized in the browser first). */
@Component({
  selector: 'kb-image-field',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="img-field">
      <div class="preview" [class.empty]="!value()">
        @if (value()) { <img [src]="value()" alt="" /> } @else { <mat-icon>add_photo_alternate</mat-icon><span>No photo yet</span> }
        @if (busy()) { <div class="busy"><mat-progress-spinner diameter="32" mode="indeterminate" /></div> }
      </div>
      <div class="side">
        <strong>{{ label() }}</strong>
        <small class="muted">JPG, PNG or WebP. Landscape works best. Large photos are resized automatically.</small>
        <label class="pick">
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)" />
          <span mat-stroked-button class="mdc-button mat-mdc-button-base mat-mdc-outlined-button"><mat-icon>upload</mat-icon> {{ value() ? 'Replace photo' : 'Upload photo' }}</span>
        </label>
        @if (error()) { <small class="err">{{ error() }}</small> }
      </div>
    </div>
  `,
  styles: `
    .img-field { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: center; }
    .preview { position: relative; aspect-ratio: 3 / 2; border-radius: 8px; overflow: hidden; background: var(--limestone); border: 1px dashed var(--line); display: grid; place-items: center; }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
    .preview.empty { color: var(--muted); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; font-size: .85rem; }
    .busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(255,255,255,.7); }
    .side { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .pick span { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; font-weight: 700; background: #fff; }
    .pick:focus-within span { outline: 3px solid var(--brass-light); }
    .err { color: #8f2a1d; font-weight: 600; }
    @media (max-width: 600px) { .img-field { grid-template-columns: 1fr; } }
  `,
})
export class ImageField {
  private api = inject(Api);
  readonly label = input('Photo');
  readonly value = model<string>('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async pick(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const dataUrl = await resizeImage(file);
      const { url } = await this.api.upload(dataUrl);
      this.value.set(url);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
