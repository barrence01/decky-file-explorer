import { Component, HostListener, inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (dialogService.activeConfirm(); as dialog) {
      <div class="modal" (click)="dialogService.resolveConfirm(false)">
        <div class="modal-content dialog-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ dialog.title }}</h3>
            <button
              class="close-btn"
              type="button"
              (click)="dialogService.resolveConfirm(false)"
            >
              ×
            </button>
          </div>
          <div class="modal-body">
            <p>{{ dialog.message }}</p>
            @if (dialog.conflictFiles?.length) {
              <ul class="dialog-conflict-list">
                @for (file of dialog.conflictFiles; track file) {
                  <li>{{ file }}</li>
                }
              </ul>
            }
          </div>
          <div class="dialog-actions">
            <button
              class="dialog-btn dialog-btn-secondary"
              type="button"
              (click)="dialogService.resolveConfirm(false)"
            >
              {{ dialog.cancelLabel || 'Cancel' }}
            </button>
            <button
              class="dialog-btn dialog-btn-primary"
              type="button"
              (click)="dialogService.resolveConfirm(true)"
            >
              {{ dialog.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly dialogService = inject(DialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogService.activeConfirm()) {
      this.dialogService.resolveConfirm(false);
    }
  }
}
