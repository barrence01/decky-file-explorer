import { Component, EventEmitter, Output, inject } from '@angular/core';
import { DriveStateService } from '../../../core/services/drive-state.service';
import { FileExplorerStateService } from '../../../core/services/file-system.service';
import { DriveInfo } from '../../../core/models/drive.model';
import { truncateStringStart } from '../../../core/utils/file-utils';

@Component({
  selector: 'app-drive-selector-overlay',
  standalone: true,
  template: `
    <button
      class="drive-overlay-trigger"
      type="button"
      (click)="onTriggerClick()"
      [title]="driveState.currentDrive()"
    >
      <i class="fas fa-hard-drive"></i>
      <span>{{ truncateStringStart(driveState.currentDrive(), 16) }}</span>
    </button>

    @if (driveState.showPicker()) {
      <div class="drive-overlay-backdrop" (click)="driveState.closePicker()"></div>
      <div class="drive-overlay-sheet">
        <header class="drive-overlay-header">
          <span>Select drive</span>
          <button type="button" (click)="driveState.closePicker()">
            <i class="fas fa-times"></i>
          </button>
        </header>
        @for (drive of driveState.drives(); track drive.path) {
          <button
            class="drive-overlay-item"
            type="button"
            [class.active]="drive.path === driveState.selectedDrivePath()"
            (click)="selectDrive(drive)"
          >
            <span>{{ drive.path }}</span>
            @if (drive.removable) {
              <span class="drive-overlay-badge">USB</span>
            }
          </button>
        }
      </div>
    }
  `,
  styles: `
    .drive-overlay-trigger {
      position: fixed;
      right: 16px;
      bottom: calc(72px + env(safe-area-inset-bottom));
      z-index: 180;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border: none;
      border-radius: 999px;
      background: #2563eb;
      color: #fff;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      cursor: pointer;
      font-size: 13px;
      max-width: calc(100vw - 32px);
    }

    .drive-overlay-trigger span {
      direction: rtl;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .drive-overlay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 280;
    }

    .drive-overlay-sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 290;
      background: #fff;
      border-radius: 16px 16px 0 0;
      padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
      max-height: 60vh;
      overflow-y: auto;
    }

    .drive-overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .drive-overlay-header button {
      border: none;
      background: transparent;
      font-size: 18px;
      cursor: pointer;
    }

    .drive-overlay-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 12px;
      border: none;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 6px;
      cursor: pointer;
      text-align: left;
    }

    .drive-overlay-item.active {
      background: #eef2ff;
    }

    .drive-overlay-badge {
      font-size: 11px;
      color: #6b7280;
    }
  `,
})
export class DriveSelectorOverlayComponent {
  @Output() driveSelected = new EventEmitter<string>();

  readonly driveState = inject(DriveStateService);
  private readonly explorerState = inject(FileExplorerStateService);
  readonly truncateStringStart = truncateStringStart;

  async onTriggerClick(): Promise<void> {
    if (this.driveState.showPicker()) {
      this.driveState.closePicker();
      return;
    }
    await this.driveState.refresh(this.explorerState.currentPath());
    this.driveState.openPicker();
  }

  selectDrive(drive: DriveInfo): void {
    this.driveState.closePicker();
    this.driveSelected.emit(drive.path);
  }
}
