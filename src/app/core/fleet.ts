import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { SEED_CARS, sortFleet } from '../../shared/business';
import { Car } from '../../shared/models';
import { Api } from './api';

/**
 * Fleet store. Starts with the built-in fleet so pages are fully rendered for Google
 * (prerendered HTML), then refreshes from the API in the browser to pick up admin price changes.
 */
@Injectable({ providedIn: 'root' })
export class Fleet {
  private api = inject(Api);
  readonly cars = signal<Car[]>(sortFleet(SEED_CARS.filter((c) => c.active)));
  readonly featured = computed(() => this.cars().filter((c) => c.featured));
  readonly cheapest = computed(() => Math.min(...this.cars().map((c) => c.pricePerDay)));
  private loaded = false;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.refresh();
  }

  async refresh() {
    try {
      const cars = await this.api.cars();
      if (cars.length) this.cars.set(sortFleet(cars));
      this.loaded = true;
    } catch {
      /* keep built-in data if the API is unreachable (e.g. static hosting) */
    }
  }

  byId(id: string) {
    return this.cars().find((c) => c.id === id);
  }
}
