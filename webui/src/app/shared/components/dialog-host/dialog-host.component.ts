import { Component } from '@angular/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ChoiceDialogComponent } from '../choice-dialog/choice-dialog.component';
import { InputDialogComponent } from '../input-dialog/input-dialog.component';

@Component({
  selector: 'app-dialog-host',
  standalone: true,
  imports: [ConfirmDialogComponent, ChoiceDialogComponent, InputDialogComponent],
  template: `
    <app-confirm-dialog />
    <app-choice-dialog />
    <app-input-dialog />
  `,
})
export class DialogHostComponent {}
