import { Injectable, signal } from '@angular/core';
import { DriveInfo } from '../models/drive.model';
import { DriveService } from './drive.service';
import { FeedbackService } from './feedback.service';
import { normalizePath } from '../utils/path-utils';

@Injectable({ providedIn: 'root' })
export class DriveStateService {
  readonly currentDrive = signal('Loading...');
  readonly selectedDrivePath = signal<string | null>(null);
  readonly drives = signal<DriveInfo[]>([]);
  readonly showPicker = signal(false);

  constructor(
    private readonly driveService: DriveService,
    private readonly feedbackService: FeedbackService
  ) {}

  async refresh(path?: string | null, selectedDrive?: string | null): Promise<void> {
    try {
      const data = await this.driveService.listDrives(path);
      const driveLabel = selectedDrive || data.currentDrive || 'Unknown';
      this.currentDrive.set(normalizePath(driveLabel));
      this.selectedDrivePath.set(normalizePath(driveLabel));
      this.drives.set(data.drives);
    } catch {
      this.feedbackService.showError('Failed to load drive info');
    }
  }

  openPicker(): void {
    this.showPicker.set(true);
  }

  togglePicker(): void {
    this.showPicker.update((value) => !value);
  }

  closePicker(): void {
    this.showPicker.set(false);
  }
}
