import { Component, Input, signal } from '@angular/core';
import { OverflowMenuItem, ToolbarActions } from './toolbar-actions';

@Component({
  selector: 'app-file-explorer-mobile-toolbar',
  standalone: true,
  template: `
    <div class="explorer-toolbar explorer-toolbar--mobile">
      @if (actions.clipboardActive) {
        <button class="mobile-toolbar-btn" type="button" disabled>
          <i class="fas fa-clipboard"></i>
          <span>{{ actions.clipboardCount }}</span>
        </button>
        <button class="mobile-toolbar-btn" type="button" (click)="actions.onPaste()">
          <i class="fas fa-paste"></i>
          <span>Paste</span>
        </button>
        <button class="mobile-toolbar-btn" type="button" (click)="actions.onClearClipboard()">
          <i class="fas fa-times"></i>
          <span>Cancel</span>
        </button>
      } @else {
        <button
          class="mobile-toolbar-btn"
          type="button"
          [disabled]="!actions.canNavigateUp"
          (click)="actions.onUp()"
        >
          <i class="fas fa-arrow-left"></i>
          <span>Up</span>
        </button>
        <button class="mobile-toolbar-btn" type="button" (click)="actions.onRefresh()">
          <i class="fas fa-rotate-right"></i>
          <span>Refresh</span>
        </button>
        @if (!actions.hasSelection) {
          <button class="mobile-toolbar-btn" type="button" (click)="actions.onUpload()">
            <i class="fas fa-upload"></i>
            <span>Upload</span>
          </button>
        } @else {
          <button class="mobile-toolbar-btn" type="button" (click)="actions.onMove()">
            <i class="fas fa-arrows-alt"></i>
            <span>Move</span>
          </button>
          <button class="mobile-toolbar-btn" type="button" (click)="actions.onCopy()">
            <i class="fas fa-copy"></i>
            <span>Copy</span>
          </button>
        }
        <button class="mobile-toolbar-btn" type="button" (click)="openOverflow()">
          <i class="fas fa-ellipsis-vertical"></i>
          <span>More</span>
        </button>
      }
    </div>

    @if (overflowOpen()) {
      <div class="mobile-overflow-backdrop" (click)="closeOverflow()"></div>
      <div class="mobile-overflow-sheet">
        @for (item of overflowItems(); track $index) {
          <button
            class="mobile-overflow-item"
            type="button"
            [class.mobile-overflow-item--active]="item.checked"
            (click)="runOverflowAction(item)"
          >
            @if (item.checked !== undefined) {
              <i
                class="fas mobile-overflow-item__icon"
                [class.fa-eye]="item.checked"
                [class.fa-eye-slash]="!item.checked"
              ></i>
              <span>{{ item.label }}</span>
            } @else {
              {{ item.label }}
            }
          </button>
        }
      </div>
    }
  `,
  styles: `
    .explorer-toolbar--mobile {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 200;
      display: flex;
      justify-content: space-around;
      gap: 4px;
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      background: #fff;
      border-top: 1px solid #ddd;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
    }

    .mobile-toolbar-btn {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px 4px;
      border: none;
      background: transparent;
      color: #1f2937;
      font-size: 11px;
      cursor: pointer;
    }

    .mobile-toolbar-btn i {
      font-size: 18px;
    }

    .mobile-toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .mobile-overflow-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 250;
    }

    .mobile-overflow-sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 260;
      background: #fff;
      border-radius: 16px 16px 0 0;
      padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 50vh;
      overflow-y: auto;
    }

    .mobile-overflow-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 12px;
      border: 1px solid transparent;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 15px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .mobile-overflow-item--active {
      border-color: #93c5fd;
      background: #eff6ff;
      box-shadow: 0 0 0 1px #bfdbfe;
    }

    .mobile-overflow-item--active span {
      color: #1d4ed8;
      font-weight: 500;
    }

    .mobile-overflow-item__icon {
      width: 18px;
      text-align: center;
      color: #6b7280;
    }

    .mobile-overflow-item--active .mobile-overflow-item__icon {
      color: #2563eb;
    }
  `,
})
export class FileExplorerMobileToolbarComponent {
  @Input({ required: true }) actions!: ToolbarActions;
  @Input({ required: true }) buildOverflowMenu!: () => OverflowMenuItem[];

  readonly overflowOpen = signal(false);
  readonly overflowItems = signal<OverflowMenuItem[]>([]);

  openOverflow(): void {
    this.overflowItems.set(this.buildOverflowMenu());
    this.overflowOpen.set(true);
  }

  closeOverflow(): void {
    this.overflowOpen.set(false);
  }

  runOverflowAction(item: OverflowMenuItem): void {
    this.closeOverflow();
    item.action();
  }
}
