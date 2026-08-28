import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileSystemObject } from '../../../core/models/file-system.model';
import { formatSize } from '../../../core/utils/file-utils';

@Component({
  selector: 'app-properties-modal',
  standalone: true,
  template: `
    @if (visible && target) {
      <div class="modal" (click)="close.emit()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Directory Properties</h3>
            <button class="close-btn" type="button" (click)="close.emit()">×</button>
          </div>
          <div class="modal-body">
            <div><strong>Path:</strong> {{ target.path }}</div>
            <div><strong>Type:</strong> {{ target.isDir ? 'Directory' : 'File' }}</div>
            <div><strong>Directory:</strong> {{ target.directory }}</div>
            @if (target.isDir) {
              <div><strong>Items:</strong> {{ target.itemsCount }}</div>
            }
            @if (target.isFile) {
              <div><strong>Name:</strong> {{ target.name }}</div>
              <div><strong>Extension:</strong> {{ target.extension }}</div>
              <div><strong>Size:</strong> {{ formatSize(target.size) }}</div>
              <div><strong>File Type:</strong> {{ target.type }}</div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class PropertiesModalComponent {
  @Input() visible = false;
  @Input() target: FileSystemObject | null = null;
  @Output() close = new EventEmitter<void>();

  readonly formatSize = formatSize;
}
