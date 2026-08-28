import { Component, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { DriveStateService } from '../../../core/services/drive-state.service';
import { FileExplorerStateService } from '../../../core/services/file-system.service';
import { DriveInfo } from '../../../core/models/drive.model';
import { truncateStringStart } from '../../../core/utils/file-utils';

@Component({
  selector: 'app-drive-selector',
  standalone: true,
  template: `
    <div class="drive-selector">
      <button
        class="drive-selector__trigger"
        type="button"
        (click)="onTriggerClick($event)"
        [title]="driveState.currentDrive()"
      >
        <i class="fas fa-hard-drive"></i>
        <span>{{ truncateStringStart(driveState.currentDrive(), 24) }}</span>
        <i class="fas fa-chevron-down"></i>
      </button>
      @if (driveState.showPicker()) {
        <div class="drive-selector__picker" (click)="$event.stopPropagation()">
          @for (drive of driveState.drives(); track drive.path) {
            <button
              class="drive-selector__item"
              type="button"
              [class.active]="drive.path === driveState.selectedDrivePath()"
              (click)="selectDrive(drive)"
            >
              <span>{{ drive.path }}</span>
              @if (drive.removable) {
                <span class="drive-selector__badge">USB</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .drive-selector {
      position: relative;
      flex-shrink: 0;
      z-index: 1;
    }

    .drive-selector__trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #f9fafb;
      cursor: pointer;
      font-size: 13px;
      max-width: 220px;
    }

    .drive-selector__trigger span {
      direction: rtl;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .drive-selector__picker {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 240px;
      max-height: 280px;
      overflow-y: auto;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      z-index: 200;
    }

    .drive-selector__item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 12px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 13px;
    }

    .drive-selector__item:hover,
    .drive-selector__item.active {
      background: #eef2ff;
    }

    .drive-selector__badge {
      font-size: 11px;
      color: #6b7280;
    }
  `,
})
export class DriveSelectorComponent {
  @Output() driveSelected = new EventEmitter<string>();

  readonly driveState = inject(DriveStateService);
  private readonly explorerState = inject(FileExplorerStateService);
  private readonly elementRef = inject(ElementRef);
  readonly truncateStringStart = truncateStringStart;

  async onTriggerClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.driveState.closePicker();
    }
  }
}
