import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MediaViewerComponent, PreviewMode } from '../media-viewer/media-viewer.component';
import { FileSystemObject } from '../../../core/models/file-system.model';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [MediaViewerComponent],
  template: `
    <app-media-viewer
      [visible]="visible"
      [mode]="mode"
      [file]="file"
      [clipThumbnailUrl]="clipThumbnailUrl"
      (close)="close.emit()"
      (download)="download.emit()"
    />
  `,
})
export class PreviewModalComponent {
  @Input() visible = false;
  @Input() mode: PreviewMode = 'file';
  @Input() file: FileSystemObject | null = null;
  @Input() clipThumbnailUrl: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
}
