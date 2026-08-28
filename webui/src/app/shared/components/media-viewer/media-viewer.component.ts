import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FileSystemObject } from '../../../core/models/file-system.model';
import { FileSystemService } from '../../../core/services/file-system.service';
import { getFileName } from '../../../core/utils/file-utils';
import { ImageViewerComponent } from './image-viewer.component';
import { TextViewerComponent } from './text-viewer.component';
import { VideoViewerComponent } from './video-viewer.component';

export type PreviewMode = 'file' | 'clip';

@Component({
  selector: 'app-media-viewer',
  standalone: true,
  imports: [ImageViewerComponent, VideoViewerComponent, TextViewerComponent],
  template: `
    @if (visible) {
      <div class="modal">
        <div class="media-viewer-shell">
          <header class="media-viewer-header">
            <span class="media-viewer-title">{{ title }}</span>
            <button
              class="media-viewer-close"
              type="button"
              aria-label="Close preview"
              (click)="close.emit()"
            >
              <i class="fas fa-times"></i>
            </button>
          </header>
          <div class="media-viewer-body">
            @if (mode === 'file' && file) {
              @if (file.type === 'image') {
                <app-image-viewer [src]="fileUrl" [alt]="title" />
              }
              @if (file.type === 'video') {
                <app-video-viewer [src]="fileUrl" />
              }
              @if (file.type === 'text') {
                <app-text-viewer
                  #textViewer
                  [file]="file"
                  (dirtyChange)="textDirty.set($event)"
                  (saved)="saved.emit()"
                />
              }
            }
            @if (mode === 'clip' && clipThumbnailUrl) {
              <app-image-viewer [src]="clipThumbnailUrl" [alt]="title" />
            }
          </div>
          @if (mode === 'file' && file) {
            <footer class="media-viewer-footer">
              @if (file.type === 'text' && textViewer?.canEdit()) {
                <button
                  type="button"
                  [disabled]="!textDirty() || (textViewer?.saving() ?? false)"
                  (click)="saveText()"
                >
                  <i class="fas fa-save"></i> Save
                </button>
              }
              <button type="button" (click)="download.emit()">
                <i class="fas fa-download"></i> Download
              </button>
            </footer>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .media-viewer-shell {
      background: #000;
      width: min(96vw, 1200px);
      height: 96vh;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .media-viewer-header,
    .media-viewer-footer {
      background: #1f2937;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      color: #fff;
      flex-shrink: 0;
    }

    .media-viewer-header {
      justify-content: space-between;
      gap: 12px;
    }

    .media-viewer-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
    }

    .media-viewer-footer {
      justify-content: center;
      gap: 12px;
    }

    .media-viewer-footer button {
      background: #2563eb;
      border: none;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .media-viewer-footer button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .media-viewer-body {
      flex: 1;
      min-height: 0;
      display: flex;
      background: #000;
    }

    .media-viewer-close {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #374151;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .media-viewer-shell {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
    }
  `,
})
export class MediaViewerComponent {
  @Input() visible = false;
  @Input() mode: PreviewMode = 'file';
  @Input() file: FileSystemObject | null = null;
  @Input() clipThumbnailUrl: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('textViewer') textViewer?: TextViewerComponent;

  readonly textDirty = signal(false);

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

  async saveText(): Promise<void> {
    await this.textViewer?.save();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.close.emit();
    }
  }
}
