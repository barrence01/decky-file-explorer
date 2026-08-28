import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FileExplorerStateService } from '../../../core/services/file-system.service';
import { DriveStateService } from '../../../core/services/drive-state.service';
import { DriveInfo } from '../../../core/models/drive.model';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  template: `
    <div class="side-panel" [class.visible]="visible">
      @if (authService.isLoggedIn()) {
        <div id="side-panel-content">
          <button type="button" (click)="logoff()">
            <i class="fas fa-sign-out-alt"></i> Logoff
          </button>
          <ul>
            <button type="button" (click)="navigateHome()">Home</button>
            <button type="button" (click)="navigateRecordings()">Steam - Game Recording</button>
          </ul>
          <div class="drive-indicator" (click)="onDriveIndicatorClick($event)">
            <div class="drive-label">Drive</div>
            <div id="currentDrive">{{ driveState.currentDrive() }}</div>
            @if (driveState.showPicker()) {
              <div class="drive-picker" (click)="$event.stopPropagation()">
                @for (drive of driveState.drives(); track drive.path) {
                  <div class="drive-item" (click)="selectDrive(drive)">
                    {{ drive.path }} {{ drive.removable ? '(USB)' : '' }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SidePanelComponent {
  @Input() visible = false;
  @Output() closePanel = new EventEmitter<void>();
  @Output() driveSelected = new EventEmitter<string>();

  readonly authService = inject(AuthService);
  readonly driveState = inject(DriveStateService);
  private readonly router = inject(Router);
  private readonly state = inject(FileExplorerStateService);

  async onDriveIndicatorClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (this.driveState.showPicker()) {
      this.driveState.closePicker();
      return;
    }

    await this.driveState.refresh(this.state.currentPath);
    this.driveState.togglePicker();
  }

  selectDrive(drive: DriveInfo): void {
    this.driveState.closePicker();
    this.driveSelected.emit(drive.path);
    this.closePanel.emit();
  }

  navigateHome(): void {
    this.state.clearClipboard();
    this.closePanel.emit();
    void this.router.navigate(['/files']);
  }

  navigateRecordings(): void {
    this.state.clearClipboard();
    this.closePanel.emit();
    void this.router.navigate(['/recordings']);
  }

  async logoff(): Promise<void> {
    this.state.clearClipboard();
    this.state.currentPath = null;
    await this.authService.logoff();
    this.closePanel.emit();
    void this.router.navigate(['/login']);
  }
}
