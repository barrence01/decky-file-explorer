import { Component, Input } from '@angular/core';
import { ToolbarActions } from './toolbar-actions';

@Component({
  selector: 'app-file-explorer-toolbar',
  standalone: true,
  template: `
    <div class="explorer-toolbar explorer-toolbar--desktop">
      @if (actions.clipboardActive) {
        <div class="toolbar-group">
          <button class="btn-interactive" type="button" disabled>
            <i class="fas fa-clipboard"></i>
            <span>{{ actions.clipboardCount }} item(s)</span>
          </button>
          <button class="btn-interactive" type="button" (click)="actions.onPaste()">
            <i class="fas fa-paste"></i>
            <span>Paste</span>
          </button>
          <button class="btn-interactive" type="button" (click)="actions.onClearClipboard()">
            <i class="fas fa-times"></i>
            <span>Cancel</span>
          </button>
        </div>
      } @else {
        <div class="toolbar-group">
          <button
            class="btn-interactive"
            type="button"
            title="Up"
            [disabled]="!actions.canNavigateUp"
            (click)="actions.onUp()"
          >
            <i class="fas fa-arrow-left"></i>
            <span>Up</span>
          </button>
          <button class="btn-interactive" type="button" title="Refresh" (click)="actions.onRefresh()">
            <i class="fas fa-rotate-right"></i>
            <span>Refresh</span>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          @if (!actions.hasSelection) {
            <button class="btn-interactive" type="button" title="Upload" (click)="actions.onUpload()">
              <i class="fas fa-upload"></i>
              <span>Upload</span>
            </button>
            <button class="btn-interactive" type="button" title="New Folder" (click)="actions.onNewFolder()">
              <i class="fas fa-folder-plus"></i>
              <span>New Folder</span>
            </button>
          } @else {
            <button class="btn-interactive" type="button" title="Move" (click)="actions.onMove()">
              <i class="fas fa-arrows-alt"></i>
              <span>Move</span>
            </button>
            <button class="btn-interactive" type="button" title="Copy" (click)="actions.onCopy()">
              <i class="fas fa-copy"></i>
              <span>Copy</span>
            </button>
            <button class="btn-interactive" type="button" title="Download" (click)="actions.onDownload()">
              <i class="fas fa-download"></i>
              <span>Download</span>
            </button>
            <button class="btn-interactive" type="button" title="Delete" (click)="actions.onDelete()">
              <i class="fas fa-trash"></i>
              <span>Delete</span>
            </button>
            @if (actions.selectionCount === 1) {
              <button class="btn-interactive" type="button" title="Rename" (click)="actions.onRename()">
                <i class="fas fa-i-cursor"></i>
                <span>Rename</span>
              </button>
            }
          }
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          @if (actions.selectionCount <= 1) {
            <button class="btn-interactive" type="button" title="Properties" (click)="actions.onProperties()">
              <i class="fas fa-circle-info"></i>
              <span>Properties</span>
            </button>
          }
          <button
            type="button"
            class="show-hidden-toggle"
            [class.show-hidden-toggle--active]="actions.showHidden"
            title="Show hidden files"
            (click)="actions.onToggleHidden()"
          >
            <i
              class="fas show-hidden-toggle__icon"
              [class.fa-eye]="actions.showHidden"
              [class.fa-eye-slash]="!actions.showHidden"
            ></i>
            <span class="show-hidden-toggle__label">Show hidden</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .explorer-toolbar--desktop {
      background: #fff;
      padding: 8px 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #ddd;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .toolbar-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .toolbar-separator {
      width: 1px;
      height: 28px;
      background: #e5e7eb;
      margin: 0 4px;
    }

    .explorer-toolbar button {
      padding: 6px 10px;
      border: 1px solid #ccc;
      background: #f9fafb;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      border-radius: 6px;
    }

    .explorer-toolbar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .show-hidden-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
    }

    .show-hidden-toggle--active {
      border-color: #93c5fd;
      background: #eff6ff;
      box-shadow: 0 0 0 1px #bfdbfe;
    }

    .show-hidden-toggle__icon {
      width: 16px;
      text-align: center;
      color: #6b7280;
    }

    .show-hidden-toggle--active .show-hidden-toggle__icon {
      color: #2563eb;
    }

    .show-hidden-toggle__label {
      color: #374151;
    }

    .show-hidden-toggle--active .show-hidden-toggle__label {
      color: #1d4ed8;
      font-weight: 500;
    }
  `,
})
export class FileExplorerToolbarComponent {
  @Input({ required: true }) actions!: ToolbarActions;
}
