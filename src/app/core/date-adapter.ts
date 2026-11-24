import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Lets guests type dates the way they write them, not only pick them in the calendar:
 * 25/11/2026, 25.11.2026, 25-11-26, 2026-11-25, or 25/11 (this year, or next year if that date has passed).
 * Day and month order follow the visitor's language (en-GB, it, ru, es, de: day first; en-US: month first).
 * The browser's own Date.parse only understands US-style text, so typed European dates were ignored.
 */
@Injectable()
export class KbDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: object): Date | null {
    if (typeof value !== 'string') return super.parse(value, parseFormat);
    const s = value.trim().replace(/\s+/g, ' ');
    if (!s) return null;

    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s); // 2026-11-25
    if (m) return this.make(+m[1], +m[2], +m[3]);

    m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2}|\d{4})\.?$/.exec(s); // 25/11/2026, 25.11.26
    if (m) {
      const [d, mo] = this.order(+m[1], +m[2]);
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return this.make(y, mo, d);
    }

    m = /^(\d{1,2})[/.\-](\d{1,2})\.?$/.exec(s); // 25/11 → the next 25 November
    if (m) {
      const [d, mo] = this.order(+m[1], +m[2]);
      const now = new Date();
      let y = now.getFullYear();
      const guess = new Date(y, mo - 1, d);
      if (guess < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y++;
      return this.make(y, mo, d);
    }

    // half-typed numbers ("2", "25/1") are not a date yet
    if (!/[a-zа-яё]/i.test(s)) return this.invalid();
    // written months (e.g. "25 Nov 2026", "Nov 25, 2026"): let the browser try
    const t = Date.parse(s);
    return isNaN(t) ? this.invalid() : new Date(t);
  }

  /** [day, month] from the two numbers as typed, using the locale's order. */
  private order(a: number, b: number): [number, number] {
    return this.dayFirst() ? [a, b] : [b, a];
  }

  private dayFirst(): boolean {
    try {
      const parts = new Intl.DateTimeFormat(this.locale).formatToParts(new Date(2026, 10, 25));
      return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month');
    } catch {
      return true;
    }
  }

  private make(y: number, month: number, d: number): Date {
    const dt = new Date(y, month - 1, d);
    // reject 31/02 and similar instead of rolling over into the next month
    return dt.getFullYear() === y && dt.getMonth() === month - 1 && dt.getDate() === d ? dt : this.invalid();
  }
}
