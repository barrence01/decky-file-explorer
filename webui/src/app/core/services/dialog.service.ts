import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  conflictFiles?: string[];
}

export interface PromptOptions {
  title: string;
  label?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ActiveConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ActivePrompt extends PromptOptions {
  resolve: (value: string | null) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly activeConfirm = signal<ActiveConfirm | null>(null);
  readonly activePrompt = signal<ActivePrompt | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.activeConfirm.set({ ...options, resolve });
    });
  }

  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      this.activePrompt.set({ ...options, resolve });
    });
  }

  resolveConfirm(confirmed: boolean): void {
    const active = this.activeConfirm();
    if (!active) {
      return;
    }
    this.activeConfirm.set(null);
    active.resolve(confirmed);
  }

  resolvePrompt(value: string | null): void {
    const active = this.activePrompt();
    if (!active) {
      return;
    }
    this.activePrompt.set(null);
    active.resolve(value);
  }
}
