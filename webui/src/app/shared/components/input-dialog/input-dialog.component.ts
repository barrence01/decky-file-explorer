import { Component, ElementRef, HostListener, inject, effect, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (dialogService.activePrompt(); as dialog) {
      <div class="modal" (click)="dialogService.resolvePrompt(null)">
        <div class="modal-content dialog-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ dialog.title }}</h3>
            <button
              class="close-btn"
              type="button"
              (click)="dialogService.resolvePrompt(null)"
            >
              ×
            </button>
          </div>
          <div class="modal-body">
            @if (dialog.label) {
              <label class="dialog-label" [for]="inputId">{{ dialog.label }}</label>
            }
            <input
              #inputField
              [id]="inputId"
              class="dialog-input"
              type="text"
              [(ngModel)]="value"
              (keydown.enter)="submit()"
            />
          </div>
          <div class="dialog-actions">
            <button
              class="dialog-btn dialog-btn-secondary"
              type="button"
              (click)="dialogService.resolvePrompt(null)"
            >
              {{ dialog.cancelLabel || 'Cancel' }}
            </button>
            <button
              class="dialog-btn dialog-btn-primary"
              type="button"
              [disabled]="!value.trim()"
              (click)="submit()"
            >
              {{ dialog.confirmLabel || 'OK' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InputDialogComponent {
  readonly dialogService = inject(DialogService);
  readonly inputId = 'dialog-input-field';
  private readonly inputField = viewChild<ElementRef<HTMLInputElement>>('inputField');
  value = '';

  constructor() {
    effect(() => {
      const dialog = this.dialogService.activePrompt();
      this.value = dialog?.initialValue ?? '';
      if (dialog?.initialValue) {
        queueMicrotask(() => {
          const input = this.inputField()?.nativeElement;
          input?.focus();
          input?.select();
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogService.activePrompt()) {
      this.dialogService.resolvePrompt(null);
    }
  }

  submit(): void {
    const trimmed = this.value.trim();
    if (!trimmed) {
      return;
    }
    this.dialogService.resolvePrompt(trimmed);
  }
}
