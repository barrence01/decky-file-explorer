import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileSystemObject } from '../../../core/models/file-system.model';
import { FileSystemService } from '../../../core/services/file-system.service';
import { TEXT_FILE_MAX_BYTES } from '../../../core/constants/file-limits';
import { ApiError } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-text-viewer',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="text-viewer">
      @if (loading()) {
        <div class="text-viewer__status">Loading...</div>
      } @else if (error()) {
        <div class="text-viewer__status text-viewer__status--error">{{ error() }}</div>
      } @else {
        <textarea
          class="text-viewer__editor"
          [readonly]="!canEdit()"
          [ngModel]="content()"
          (ngModelChange)="onContentChange($event)"
          spellcheck="false"
        ></textarea>
        <div class="text-viewer__meta">
          <span>{{ byteSize() }} / {{ maxBytes() }} bytes</span>
          @if (!canEdit()) {
            <span class="text-viewer__badge">Read only</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1 1 auto;
      align-self: stretch;
      min-width: 0;
      min-height: 0;
      width: 100%;
      height: 100%;
    }

    .text-viewer {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: #111827;
    }

    .text-viewer__editor {
      flex: 1 1 auto;
      min-height: 0;
      height: 0;
      width: 100%;
      box-sizing: border-box;
      border: none;
      resize: none;
      padding: 16px;
      background: #111827;
      color: #f9fafb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      line-height: 1.5;
    }

    .text-viewer__editor:focus {
      outline: none;
    }

    .text-viewer__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 16px;
      background: #1f2937;
      color: #9ca3af;
      font-size: 12px;
      flex-shrink: 0;
    }

    .text-viewer__badge {
      color: #fbbf24;
    }

    .text-viewer__status {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d1d5db;
      padding: 24px;
    }

    .text-viewer__status--error {
      color: #fca5a5;
    }
  `,
})
export class TextViewerComponent implements OnChanges {
  @Input({ required: true }) file!: FileSystemObject;
  @Output() saved = new EventEmitter<void>();
  @Output() dirtyChange = new EventEmitter<boolean>();

  private readonly fileSystemService = inject(FileSystemService);

  readonly content = signal('');
  readonly originalContent = signal('');
  readonly canEdit = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly byteSize = signal(0);
  readonly maxBytes = signal(TEXT_FILE_MAX_BYTES);
  readonly saving = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && this.file) {
      void this.loadContent();
    }
  }

  get isDirty(): boolean {
    return this.content() !== this.originalContent();
  }

  onContentChange(value: string): void {
    this.content.set(value);
    this.byteSize.set(new TextEncoder().encode(value).length);
    this.dirtyChange.emit(this.isDirty);
  }

  async save(): Promise<boolean> {
    if (!this.canEdit() || !this.isDirty || this.saving()) {
      return false;
    }

    this.saving.set(true);
    try {
      await this.fileSystemService.saveTextFile(this.file.path, this.content());
      this.originalContent.set(this.content());
      this.dirtyChange.emit(false);
      this.saved.emit();
      return true;
    } catch (error) {
      this.error.set(this.extractError(error));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async loadContent(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.content.set('');
    this.originalContent.set('');

    try {
      const response = await this.fileSystemService.readTextFile(this.file.path);
      this.content.set(response.content);
      this.originalContent.set(response.content);
      this.byteSize.set(response.size);
      this.maxBytes.set(response.maxBytes);
      this.canEdit.set(response.isWritable && !this.file.isProtected);
      this.dirtyChange.emit(false);
    } catch (error) {
      this.error.set(this.extractError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load text file';
  }
}
