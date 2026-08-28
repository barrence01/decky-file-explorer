import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FileSystemObject } from '../../../core/models/file-system.model';
import { FileSystemService } from '../../../core/services/file-system.service';
import { getFileName } from '../../../core/utils/file-utils';

export type PreviewMode = 'file' | 'clip';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  template: `
    @if (visible) {
      <div class="modal">
        <div class="preview-shell">
          <header class="preview-header">
            <span>{{ title }}</span>
            <button
              class="preview-close-btn"
              type="button"
              aria-label="Close preview"
              (click)="close.emit()"
            >
              x
            </button>
          </header>
          <div class="preview-body">
            @if (mode === 'file' && file) {
              @if (file.type === 'image') {
                <img class="preview-media-item" [src]="fileUrl" [alt]="title" />
              }
              @if (file.type === 'video') {
                <video
                  class="preview-media-item"
                  [src]="fileUrl"
                  controls
                  autoplay
                  playsinline
                ></video>
              }
            }
            @if (mode === 'clip' && clipThumbnailUrl) {
              <img class="preview-media-item" [src]="clipThumbnailUrl" [alt]="title" />
            }
          </div>
          @if (mode === 'file' && file) {
            <footer class="preview-footer">
              <button type="button" (click)="download.emit()">
                <i class="fas fa-download"></i> Download
              </button>
            </footer>
          }
        </div>
      </div>
    }
  `,
})
export class PreviewModalComponent {
  @Input() visible = false;
  @Input() mode: PreviewMode = 'file';
  @Input() file: FileSystemObject | null = null;
  @Input() clipThumbnailUrl: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  constructor(private readonly fileSystemService: FileSystemService) {}

  get title(): string {
    if (this.mode === 'clip') {
      return this.file ? `Steam Clip ${getFileName(this.file)}` : 'Steam Clip';
    }

    return this.file ? getFileName(this.file) : '';
  }

  get fileUrl(): string {
    return this.file ? this.fileSystemService.getFileViewUrl(this.file.path) : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.close.emit();
    }
  }
}
