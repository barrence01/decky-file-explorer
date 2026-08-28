import { Component, Input, signal } from '@angular/core';
import { SortField } from '../../../core/models/file-system.model';
import { OverflowMenuItem, ToolbarActions } from './toolbar-actions';

interface SortOption {
  field: SortField;
  label: string;
  icon: string;
}

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
          <button
            class="mobile-toolbar-btn"
            type="button"
            [class.mobile-toolbar-btn--active]="sortSheetOpen()"
            (click)="openSortSheet()"
          >
            <i class="fas fa-arrow-down-wide-short"></i>
            <span>Sort</span>
          </button>
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

    @if (sortSheetOpen()) {
      <div class="mobile-sheet-backdrop" (click)="closeSortSheet()"></div>
      <div class="mobile-sort-sheet">
        <div class="mobile-sort-sheet__header">
          <h3 class="mobile-sort-sheet__title">Sort by</h3>
          <button class="mobile-sort-sheet__close" type="button" (click)="closeSortSheet()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="mobile-sort-sheet__options">
          @for (option of sortOptions; track option.field) {
            <button
              class="mobile-sort-option"
              type="button"
              [class.mobile-sort-option--active]="actions.sortField === option.field"
              (click)="selectSortField(option.field)"
            >
              <i class="fas mobile-sort-option__icon" [class]="option.icon"></i>
              <span class="mobile-sort-option__label">{{ option.label }}</span>
              @if (actions.sortField === option.field) {
                <i class="fas fa-check mobile-sort-option__check"></i>
              }
            </button>
          }
        </div>

        <div class="mobile-sort-sheet__direction">
          <span class="mobile-sort-sheet__direction-label">Order</span>
          <div class="mobile-sort-direction-toggle">
            <button
              type="button"
              class="mobile-sort-direction-btn"
              [class.mobile-sort-direction-btn--active]="actions.sortDirection === 'asc'"
              (click)="setSortDirection('asc')"
            >
              <i class="fas fa-arrow-up-wide-short"></i>
              <span>{{ ascendingLabel }}</span>
            </button>
            <button
              type="button"
              class="mobile-sort-direction-btn"
              [class.mobile-sort-direction-btn--active]="actions.sortDirection === 'desc'"
              (click)="setSortDirection('desc')"
            >
              <i class="fas fa-arrow-down-wide-short"></i>
              <span>{{ descendingLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    }

    @if (overflowOpen()) {
      <div class="mobile-sheet-backdrop" (click)="closeOverflow()"></div>
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
      gap: 2px;
      padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
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
      padding: 6px 2px;
      border: none;
      background: transparent;
      color: #1f2937;
      font-size: 10px;
      cursor: pointer;
      border-radius: 8px;
      transition: background-color 0.15s ease;
    }

    .mobile-toolbar-btn i {
      font-size: 17px;
    }

    .mobile-toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .mobile-toolbar-btn--active {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .mobile-sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 250;
    }

    .mobile-sort-sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 260;
      background: #fff;
      border-radius: 16px 16px 0 0;
      padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .mobile-sort-sheet__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .mobile-sort-sheet__title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    .mobile-sort-sheet__close {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: #f3f4f6;
      color: #374151;
      font-size: 16px;
      cursor: pointer;
    }

    .mobile-sort-sheet__options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-sort-option {
      width: 100%;
      min-height: 52px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .mobile-sort-option--active {
      border-color: #93c5fd;
      background: #eff6ff;
      box-shadow: 0 0 0 1px #bfdbfe;
    }

    .mobile-sort-option__icon {
      width: 20px;
      text-align: center;
      color: #6b7280;
      font-size: 16px;
    }

    .mobile-sort-option--active .mobile-sort-option__icon {
      color: #2563eb;
    }

    .mobile-sort-option__label {
      flex: 1;
      color: #374151;
    }

    .mobile-sort-option--active .mobile-sort-option__label {
      color: #1d4ed8;
      font-weight: 500;
    }

    .mobile-sort-option__check {
      color: #2563eb;
      font-size: 14px;
    }

    .mobile-sort-sheet__direction {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-sort-sheet__direction-label {
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .mobile-sort-direction-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .mobile-sort-direction-btn {
      min-height: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 10px 8px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 10px;
      font-size: 12px;
      color: #374151;
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .mobile-sort-direction-btn i {
      font-size: 16px;
      color: #6b7280;
    }

    .mobile-sort-direction-btn--active {
      border-color: #93c5fd;
      background: #eff6ff;
      box-shadow: 0 0 0 1px #bfdbfe;
      color: #1d4ed8;
      font-weight: 500;
    }

    .mobile-sort-direction-btn--active i {
      color: #2563eb;
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

  readonly sortOptions: SortOption[] = [
    { field: 'name', label: 'Name', icon: 'fa-font' },
    { field: 'created', label: 'Created', icon: 'fa-calendar-plus' },
    { field: 'modified', label: 'Modified', icon: 'fa-clock' },
  ];

  readonly overflowOpen = signal(false);
  readonly sortSheetOpen = signal(false);
  readonly overflowItems = signal<OverflowMenuItem[]>([]);

  get ascendingLabel(): string {
    return this.actions.sortField === 'name' ? 'A to Z' : 'Oldest first';
  }

  get descendingLabel(): string {
    return this.actions.sortField === 'name' ? 'Z to A' : 'Newest first';
  }

  openSortSheet(): void {
    this.closeOverflow();
    this.sortSheetOpen.set(true);
  }

  closeSortSheet(): void {
    this.sortSheetOpen.set(false);
  }

  openOverflow(): void {
    this.closeSortSheet();
    this.overflowItems.set(this.buildOverflowMenu());
    this.overflowOpen.set(true);
  }

  closeOverflow(): void {
    this.overflowOpen.set(false);
  }

  selectSortField(field: SortField): void {
    this.actions.onSortFieldChange(field);
  }

  setSortDirection(direction: 'asc' | 'desc'): void {
    this.actions.onSetSortDirection(direction);
  }

  runOverflowAction(item: OverflowMenuItem): void {
    this.closeOverflow();
    if (item.openSortSheet) {
      this.openSortSheet();
      return;
    }
    item.action();
  }
}
