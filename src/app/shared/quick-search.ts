import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { LOCATIONS } from '../../shared/business';
import { LocationId } from '../../shared/models';
import { toDateParam } from './dates';
import { TPipe } from '../core/i18n';

/** Pickup / dates search used under the home hero. */
@Component({
  selector: 'kb-quick-search',
  imports: [TPipe, FormsModule, MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatSelectModule],
  template: `
    <form class="qs" (ngSubmit)="go()">
      <mat-form-field>
        <mat-label>{{ 'Where should we bring the car?' | t }}</mat-label>
        <mat-select [ngModel]="location" (ngModelChange)="pickLoc($event)" name="loc">
          @for (l of locations; track l.id) {
            <mat-option [value]="l.id">{{ l.label | t }}{{ l.fee ? ' (+$' + l.fee + ')' : '' }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>{{ 'Return place' | t }}</mat-label>
        <mat-select [ngModel]="ret" (ngModelChange)="ret = $event; retPicked = true" name="ret">
          @for (l of locations; track l.id) {
            <mat-option [value]="l.id">{{ l.label | t }}{{ l.fee ? ' (+$' + l.fee + ')' : '' }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>{{ 'Pickup and return dates' | t }}</mat-label>
        <mat-date-range-input [rangePicker]="picker" [min]="today">
          <input matStartDate [(ngModel)]="start" name="start" [placeholder]="'Pickup' | t" />
          <input matEndDate [(ngModel)]="end" name="end" [placeholder]="'Return' | t" />
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-date-range-picker #picker />
      </mat-form-field>
      <button mat-flat-button class="btn-brass go" type="submit">{{ 'See prices' | t }}</button>
    </form>
  `,
  styles: `
    .qs { display: grid; grid-template-columns: 1fr 1fr 1.15fr auto; gap: 12px; align-items: center; }
    .go { height: 56px !important; padding: 0 30px !important; font-size: 1rem; }
    @media (max-width: 1100px) { .qs { grid-template-columns: 1fr 1fr; } .go { width: 100%; grid-column: 1 / -1; } }
    @media (max-width: 820px) { .qs { grid-template-columns: 1fr; gap: 10px; } .go { width: 100%; } }
  `,
})
export class QuickSearch {
  private router = inject(Router);
  protected readonly locations = LOCATIONS;
  protected readonly today = new Date();
  protected location: LocationId = 'airport';
  /** return place follows the pickup place until the guest picks another */
  protected ret: LocationId = 'airport';
  protected retPicked = false;
  protected start: Date | null = null;
  protected end: Date | null = null;

  pickLoc(id: LocationId) {
    this.location = id;
    if (!this.retPicked) this.ret = id;
  }

  go() {
    const queryParams: Record<string, string> = { loc: this.location, ret: this.ret };
    if (this.start) queryParams['from'] = toDateParam(this.start);
    if (this.end) queryParams['to'] = toDateParam(this.end);
    this.router.navigate(['/book'], { queryParams });
  }
}
