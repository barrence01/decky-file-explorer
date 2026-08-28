import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private errorTimeout: ReturnType<typeof setTimeout> | null = null;
  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  showError(message: string): void {
    this.errorMessage.set(message);

    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.errorMessage.set(null);
    }, 5000);
  }

  showSuccess(message: string): void {
    this.successMessage.set(message);

    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }

    this.successTimeout = setTimeout(() => {
      this.successMessage.set(null);
    }, 5000);
  }
}
