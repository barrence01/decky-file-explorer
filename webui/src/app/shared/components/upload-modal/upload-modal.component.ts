import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  template: `
    @if (visible) {
      <div class="modal">
        <div class="modal-content">
          <h3>Uploading…</h3>
          <div class="progress-container">
            <div class="progress-bar" [style.width.%]="progress"></div>
          </div>
          <div class="upload-status">{{ progress }}%</div>
        </div>
      </div>
    }
  `,
})
export class UploadModalComponent {
  @Input() visible = false;
  @Input() progress = 0;
}
