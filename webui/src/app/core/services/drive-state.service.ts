import { Injectable, signal } from '@angular/core';
import { DriveInfo } from '../models/drive.model';
import { DriveService } from './drive.service';
import { FeedbackService } from './feedback.service';

@Injectable({ providedIn: 'root' })
export class DriveStateService {
  readonly currentDrive = signal('Loading...');
  readonly drives = signal<DriveInfo[]>([]);
  readonly showPicker = signal(false);

  constructor(
    private readonly driveService: DriveService,
    private readonly feedbackService: FeedbackService
  ) {}

  async refresh(path?: string | null): Promise<void> {
    try {
      const data = await this.driveService.listDrives(path);
      this.currentDrive.set(data.currentDrive || 'Unknown');
      this.drives.set(data.drives.filter((drive) => drive.path !== '/'));
    } catch {
      this.feedbackService.showError('Failed to load drive info');
    }
  }

  togglePicker(): void {
    this.showPicker.update((value) => !value);
  }

  closePicker(): void {
    this.showPicker.set(false);
  }
}
