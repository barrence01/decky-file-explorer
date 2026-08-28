import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly isLoading = signal(false);
  private depth = 0;

  show(): void {
    this.depth += 1;
    this.isLoading.set(true);
  }

  hide(): void {
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) {
      this.isLoading.set(false);
    }
  }

  async withLoading<T>(callback: () => Promise<T>): Promise<T> {
    this.show();
    try {
      return await callback();
    } finally {
      this.hide();
    }
  }
}
