import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileSystemObject } from '../../core/models/file-system.model';
import {
  FileExplorerStateService,
  FileSystemService,
} from '../../core/services/file-system.service';
import { LoadingService } from '../../core/services/loading.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { UploadService } from '../../core/services/upload.service';
import { ApiError } from '../../core/models/api-error.model';
import { PasteConflictResponse } from '../../core/models/file-system.model';
import {
  getFileName,
  getParentPath,
  isMobilePointer,
  shouldHighlightFolder,
  truncateString,
} from '../../core/utils/file-utils';
import { PropertiesModalComponent } from '../../shared/components/properties-modal/properties-modal.component';
import { PreviewModalComponent } from '../../shared/components/preview-modal/preview-modal.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';
import { LongPressDirective } from '../../shared/directives/long-press.directive';
import { DriveStateService } from '../../core/services/drive-state.service';
import { NavigationStateService } from '../../core/services/navigation-state.service';

interface OverflowMenuItem {
  label: string;
  action: () => void;
  checked?: boolean;
}

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [
    FormsModule,
    PropertiesModalComponent,
    PreviewModalComponent,
    UploadModalComponent,
    LongPressDirective,
  ],
  templateUrl: './file-explorer.component.html',
})
export class FileExplorerComponent implements OnInit {
  readonly state = inject(FileExplorerStateService);
  private readonly fileSystemService = inject(FileSystemService);
  private readonly loadingService = inject(LoadingService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly uploadService = inject(UploadService);
  private readonly driveState = inject(DriveStateService);
  private readonly navigationState = inject(NavigationStateService);

  readonly propertiesVisible = signal(false);
  readonly previewVisible = signal(false);
  readonly previewFile = signal<FileSystemObject | null>(null);
  readonly uploadVisible = signal(false);
  readonly uploadProgress = signal(0);
  readonly overflowMenuOpen = signal(false);
  readonly overflowMenuItems = signal<OverflowMenuItem[]>([]);

  readonly truncateString = truncateString;
  readonly getFileName = getFileName;
  readonly shouldHighlightFolder = shouldHighlightFolder;
  readonly isMobile = isMobilePointer;

  constructor() {
    effect(() => {
      const requestedPath = this.navigationState.directoryRequest();
      if (requestedPath !== undefined) {
        this.navigationState.directoryRequest.set(undefined);
        void this.loadDirectory(requestedPath);
      }
    });
  }

  ngOnInit(): void {
    void this.loadDirectory();
    setTimeout(() => {
      void this.driveState.refresh();
    }, 1000);
  }

  get visibleFiles(): FileSystemObject[] {
    return this.state.dirContent.filter((file) => this.state.showHidden || !file.isHidden);
  }

  get parentPath(): string | null {
    return getParentPath(this.state.currentPath);
  }

  get propertiesTarget(): FileSystemObject | null {
    if (this.state.selectedItems.length === 1) {
      return this.state.selectedItems[0];
    }

    if (this.state.selectedItems.length === 0) {
      return this.state.selectedDir;
    }

    return null;
  }

  async loadDirectory(path: string | null = null): Promise<void> {
    await this.loadingService.withLoading(async () => {
      this.state.clearSelection();

      try {
        const data = await this.fileSystemService.listDirectory(path);
        this.state.selectedDir = data.selectedDir;
        this.state.currentPath = data.selectedDir.path;
        this.state.dirContent = data.dirContent;
        this.navigationState.setBreadcrumb(this.state.currentPath);
        await this.driveState.refresh(this.state.currentPath);
      } catch (error) {
        this.feedbackService.showError(this.extractError(error, 'Failed to load directory'));
        setTimeout(() => {
          void this.loadDirectory(null);
        }, 2000);
      }
    });
  }

  onDriveSelected(path: string): void {
    void this.loadDirectory(path);
  }

  toggleSelect(file: FileSystemObject, element: HTMLElement): void {
    const index = this.state.selectedItems.indexOf(file);
    if (index >= 0) {
      this.state.selectedItems.splice(index, 1);
      element.classList.remove('selected');
    } else {
      this.state.selectedItems.push(file);
      element.classList.add('selected');
    }
  }

  onDesktopClick(event: MouseEvent, file: FileSystemObject): void {
    const element = event.currentTarget as HTMLElement;
    this.toggleSelect(file, element);
  }

  onDesktopDoubleClick(file: FileSystemObject): void {
    if (file.isDir) {
      void this.loadDirectory(file.path);
      return;
    }

    if (file.type === 'image' || file.type === 'video') {
      this.openPreview(file);
    }
  }

  onMobileLongPress(file: FileSystemObject, element: HTMLElement): void {
    this.toggleSelect(file, element);
  }

  onMobileShortPress(file: FileSystemObject, element: HTMLElement): void {

    if (this.state.selectedItems.length === 0) {
      if (file.isDir) {
        void this.loadDirectory(file.path);
      } else if (file.type === 'image' || file.type === 'video') {
        this.openPreview(file);
      }
      return;
    }

    this.toggleSelect(file, element);
  }

  openPreview(file: FileSystemObject): void {
    this.previewFile.set(file);
    this.previewVisible.set(true);
  }

  closePreview(): void {
    this.previewVisible.set(false);
    this.previewFile.set(null);
  }

  async downloadPreview(): Promise<void> {
    const file = this.previewFile();
    if (!file) {
      return;
    }

    const previousSelection = [...this.state.selectedItems];
    this.state.selectedItems = [file];
    await this.downloadSelected();
    this.state.selectedItems = previousSelection;
  }

  showProperties(): void {
    if (!this.propertiesTarget) {
      return;
    }
    this.propertiesVisible.set(true);
  }

  closeProperties(): void {
    this.propertiesVisible.set(false);
  }

  startCopy(): void {
    this.state.clipboardItems = [...this.state.selectedItems];
    this.state.clipboardMode = 'copy';
    this.state.clearSelection();
  }

  startMove(): void {
    this.state.clipboardItems = [...this.state.selectedItems];
    this.state.clipboardMode = 'move';
    this.state.clearSelection();
  }

  clearClipboard(): void {
    this.state.clearClipboard();
  }

  async pasteClipboard(overwrite = false): Promise<void> {
    if (!this.state.clipboardItems.length || !this.state.clipboardMode || !this.state.currentPath) {
      return;
    }

    try {
      await this.fileSystemService.pasteItems(
        this.state.clipboardMode,
        this.state.currentPath,
        this.state.clipboardItems.map((item) => item.path),
        overwrite
      );
      this.clearClipboard();
      await this.loadDirectory(this.state.currentPath);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const files = (error.payload as PasteConflictResponse | undefined)?.files ?? [];
        const confirmed = confirm(
          `The following files already exist:\n\n${files.join('\n')}\n\nOverwrite them?`
        );
        if (confirmed) {
          await this.pasteClipboard(true);
        }
        return;
      }

      this.feedbackService.showError(this.extractError(error, 'Paste failed'));
    }
  }

  async deleteSelected(): Promise<void> {
    if (!this.state.selectedItems.length) {
      return;
    }

    if (!confirm(`Delete ${this.state.selectedItems.length} item(s)?`)) {
      return;
    }

    await this.loadingService.withLoading(async () => {
      try {
        await this.fileSystemService.deleteItems(this.state.selectedItems.map((item) => item.path));
        await this.loadDirectory(this.state.currentPath);
      } catch (error) {
        this.feedbackService.showError(this.extractError(error, 'Delete failed'));
      }
    });
  }

  async renameSelected(): Promise<void> {
    const item = this.state.selectedItems[0];
    if (!item) {
      return;
    }

    const newName = prompt('New name:', item.name || getFileName(item));
    if (!newName) {
      return;
    }

    try {
      await this.fileSystemService.renameItem(item.path, newName);
      await this.loadDirectory(this.state.currentPath);
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Rename failed'));
    }
  }

  async createNewFolder(): Promise<void> {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !this.state.currentPath) {
      return;
    }

    const targetPath = `${this.state.currentPath}/${folderName}`;

    try {
      await this.fileSystemService.createDirectory(targetPath);
      await this.loadDirectory(this.state.currentPath);
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Failed to create folder'));
    }
  }

  async uploadFiles(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async () => {
      if (!input.files?.length || !this.state.currentPath) {
        return;
      }

      this.uploadVisible.set(true);
      this.uploadProgress.set(0);

      for (const file of Array.from(input.files)) {
        try {
          await this.uploadService.uploadFile(this.state.currentPath!, file, (percent) => {
            this.uploadProgress.set(percent);
          });
        } catch (error) {
          this.feedbackService.showError(`Upload failed for "${file.name}": ${error}`);
          break;
        }
      }

      this.uploadVisible.set(false);
      await this.loadDirectory(this.state.currentPath);
    };

    input.click();
  }

  async downloadSelected(): Promise<void> {
    if (!this.state.selectedItems.length) {
      return;
    }

    const paths = this.state.selectedItems.map((item) => item.path);

    try {
      const blob = await this.uploadService.downloadItems(paths);
      const filename =
        paths.length === 1 ? getFileName(this.state.selectedItems[0]) : 'download.zip';
      this.uploadService.triggerDownload(blob, filename);
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Download failed'));
    }
  }

  toggleShowHidden(): void {
    this.state.showHidden = !this.state.showHidden;
    void this.loadDirectory(this.state.currentPath);
  }

  openOverflowMenu(items: OverflowMenuItem[]): void {
    this.overflowMenuItems.set(items);
    this.overflowMenuOpen.set(true);
  }

  closeOverflowMenu(): void {
    this.overflowMenuOpen.set(false);
  }

  runOverflowAction(item: OverflowMenuItem): void {
    this.closeOverflowMenu();
    item.action();
  }

  buildOverflowMenu(): OverflowMenuItem[] {
    const selectionCount = this.state.selectedItems.length;
    const items: OverflowMenuItem[] = [];

    if (selectionCount === 0) {
      items.push({ label: 'New Folder', action: () => this.createNewFolder() });
    }

    if (selectionCount === 1) {
      items.push({ label: 'Rename', action: () => this.renameSelected() });
      items.push({ label: 'Download', action: () => this.downloadSelected() });
    }

    if (selectionCount > 1) {
      items.push({ label: 'Download', action: () => this.downloadSelected() });
    }

    items.push({
      label: 'Show hidden',
      checked: this.state.showHidden,
      action: () => this.toggleShowHidden(),
    });

    if (selectionCount <= 1) {
      items.push({ label: 'Properties', action: () => this.showProperties() });
    }

    if (selectionCount > 0) {
      items.push({ label: 'Delete', action: () => this.deleteSelected() });
    }

    return items;
  }

  getFileIconClass(file: FileSystemObject): string {
    if (file.isDir) {
      return 'fas fa-folder';
    }
    if (file.type === 'audio') {
      return 'fas fa-compact-disc';
    }
    if (file.type === 'image') {
      return 'fas fa-image';
    }
    return 'fas fa-file';
  }

  private extractError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { error?: string } }).error;
      if (payload?.error) {
        return payload.error;
      }
    }

    return fallback;
  }
}
