import { Component } from '@angular/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { InputDialogComponent } from '../input-dialog/input-dialog.component';

@Component({
  selector: 'app-dialog-host',
  standalone: true,
  imports: [ConfirmDialogComponent, InputDialogComponent],
  template: `
    <app-confirm-dialog />
    <app-input-dialog />
  `,
})
export class DialogHostComponent {}
