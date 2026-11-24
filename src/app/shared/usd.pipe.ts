import { Pipe, PipeTransform } from '@angular/core';

/** 82 -> "$82", 82.5 -> "$82.50" */
@Pipe({ name: 'usd' })
export class UsdPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v == null || isNaN(v)) return '';
    const neg = v < 0 ? '-' : '';
    const a = Math.abs(v);
    return neg + '$' + (Number.isInteger(a) ? a.toLocaleString('en-US') : a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }
}
