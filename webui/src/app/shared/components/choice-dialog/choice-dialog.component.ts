import { Component, HostListener, inject } from '@angular/core';
import { ChoiceResult, DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-choice-dialog',
  standalone: true,
  template: `
    @if (dialogService.activeChoice(); as dialog) {
      <div class="modal" (click)="resolve('cancel')">
        <div class="modal-content dialog-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ dialog.title }}</h3>
            <button
              class="close-btn"
              type="button"
              (click)="resolve('cancel')"
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
          <div class="dialog-actions dialog-actions--stacked">
            <button
              class="dialog-btn dialog-btn-primary"
              type="button"
              (click)="resolve('replace')"
            >
              {{ dialog.replaceLabel || 'Replace' }}
            </button>
            @if (dialog.suggestedName) {
              <button
                class="dialog-btn dialog-btn-secondary"
                type="button"
                (click)="resolve('rename')"
              >
                {{ dialog.renameLabel || ('Save as "' + dialog.suggestedName + '"') }}
              </button>
            }
            <button
              class="dialog-btn dialog-btn-secondary"
              type="button"
              (click)="resolve('cancel')"
            >
              {{ dialog.cancelLabel || 'Cancel' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ChoiceDialogComponent {
  readonly dialogService = inject(DialogService);

  resolve(result: ChoiceResult): void {
    this.dialogService.resolveChoice(result);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogService.activeChoice()) {
      this.resolve('cancel');
    }
  }
}
