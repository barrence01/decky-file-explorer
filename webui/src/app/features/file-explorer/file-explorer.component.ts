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
  isCompactView,
  isEditableTextFile,
  shouldHighlightFolder,
  truncateString,
} from '../../core/utils/file-utils';
import { TEXT_FILE_MAX_BYTES } from '../../core/constants/file-limits';
import { PropertiesModalComponent } from '../../shared/components/properties-modal/properties-modal.component';
import { PreviewModalComponent } from '../../shared/components/preview-modal/preview-modal.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';
import { LongPressDirective } from '../../shared/directives/long-press.directive';
import { DriveStateService } from '../../core/services/drive-state.service';
import { NavigationStateService } from '../../core/services/navigation-state.service';
import { DialogService } from '../../core/services/dialog.service';
import { FileExplorerToolbarComponent } from './toolbar/file-explorer-toolbar.component';
import { FileExplorerMobileToolbarComponent } from './toolbar/file-explorer-mobile-toolbar.component';
import { OverflowMenuItem, ToolbarActions } from './toolbar/toolbar-actions';

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [
    FormsModule,
    PropertiesModalComponent,
    PreviewModalComponent,
    UploadModalComponent,
    LongPressDirective,
    FileExplorerToolbarComponent,
    FileExplorerMobileToolbarComponent,
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
  private readonly dialogService = inject(DialogService);

  readonly propertiesVisible = signal(false);
  readonly previewVisible = signal(false);
  readonly previewFile = signal<FileSystemObject | null>(null);
  readonly uploadVisible = signal(false);
  readonly uploadProgress = signal(0);
  readonly showDirectoryError = signal(false);
  readonly directoryErrorMessage = signal('');

  readonly truncateString = truncateString;
  readonly getFileName = getFileName;
  readonly shouldHighlightFolder = shouldHighlightFolder;
  readonly isCompactView = isCompactView;

  private lastRequestedPath: string | null = null;

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
  }

  get visibleFiles(): FileSystemObject[] {
    const seen = new Set<string>();
    return this.state
      .dirContent()
      .filter((file) => {
        if (seen.has(file.path)) {
          return false;
        }
        seen.add(file.path);
        return true;
      })
      .filter((file) => this.state.showHidden() || !file.isHidden);
  }

  get parentPath(): string | null {
    return this.state.selectedDir()?.parentPath ?? null;
  }

  get canNavigateUp(): boolean {
    return this.state.selectedDir()?.canNavigateUp ?? false;
  }

  get propertiesTarget(): FileSystemObject | null {
    const selectedItems = this.state.selectedItems();
    if (selectedItems.length === 1) {
      return selectedItems[0];
    }

    if (selectedItems.length === 0) {
      return this.state.selectedDir();
    }

    return null;
  }

  get toolbarActions(): ToolbarActions {
    return {
      canNavigateUp: this.canNavigateUp,
      hasSelection: this.state.selectedItems().length > 0,
      selectionCount: this.state.selectedItems().length,
      clipboardActive: this.state.clipboardItems().length > 0,
      clipboardCount: this.state.clipboardItems().length,
      showHidden: this.state.showHidden(),
      onUp: () => this.navigateUp(),
      onRefresh: () => this.retryDirectory(),
      onUpload: () => this.uploadFiles(),
      onMove: () => this.startMove(),
      onCopy: () => this.startCopy(),
      onDownload: () => this.downloadSelected(),
      onDelete: () => this.deleteSelected(),
      onRename: () => this.renameSelected(),
      onNewFolder: () => this.createNewFolder(),
      onProperties: () => this.showProperties(),
      onToggleHidden: () => this.toggleShowHidden(),
      onPaste: () => this.pasteClipboard(),
      onClearClipboard: () => this.clearClipboard(),
    };
  }

  async loadDirectory(path: string | null = null): Promise<void> {
    this.lastRequestedPath = path;
    await this.loadingService.withLoading(async () => {
      this.state.clearSelection();

      try {
        const data = await this.fileSystemService.listDirectory(path);
        this.showDirectoryError.set(false);
        this.directoryErrorMessage.set('');
        this.state.selectedDir.set(data.selectedDir);
        this.state.currentPath.set(data.selectedDir.path);
        this.state.dirContent.set(data.dirContent);
        this.navigationState.setBreadcrumbs(data.breadcrumbs);
        await this.driveState.refresh(data.selectedDir.path, data.selectedDrive);
      } catch (error) {
        this.handleDirectoryError(error);
      }
    });
  }

  navigateUp(): void {
    const parent = this.parentPath;
    if (parent) {
      void this.loadDirectory(parent);
    }
  }

  retryDirectory(): void {
    void this.loadDirectory(this.state.currentPath() ?? this.lastRequestedPath);
  }

  goHome(): void {
    void this.loadDirectory(null);
  }

  handleDirectoryError(error: unknown): void {
    const apiError = this.toApiError(error);
    this.feedbackService.showError(apiError.message);
    this.directoryErrorMessage.set(apiError.message);
    this.showDirectoryError.set(true);

    const currentDir = this.state.selectedDir();
    if (apiError.parentPath && apiError.canNavigateUp) {
      this.state.selectedDir.set({
        ...(currentDir ?? {
          path: this.state.currentPath() ?? '',
          isDir: true,
          isFile: false,
          isHidden: false,
          directory: this.state.currentPath() ?? '',
        }),
        parentPath: apiError.parentPath,
        canNavigateUp: true,
      });
      return;
    }

    if (apiError.parentPath && !currentDir) {
      void this.loadDirectory(apiError.parentPath);
    }
  }

  isSelected(file: FileSystemObject): boolean {
    return this.state.selectedItems().some((item) => item.path === file.path);
  }

  toggleSelect(file: FileSystemObject): void {
    const items = this.state.selectedItems();
    const index = items.findIndex((item) => item.path === file.path);
    if (index >= 0) {
      this.state.selectedItems.set(items.filter((_, i) => i !== index));
    } else {
      this.state.selectedItems.set([...items, file]);
    }
  }

  onDesktopClick(event: MouseEvent, file: FileSystemObject): void {
    event.preventDefault();
    this.toggleSelect(file);
  }

  onDesktopDoubleClick(file: FileSystemObject): void {
    if (file.isDir) {
      if (file.isProtected) {
        this.feedbackService.showError('Access denied');
        return;
      }
      void this.loadDirectory(file.path);
      return;
    }

    if (file.type === 'image' || file.type === 'video') {
      this.openPreview(file);
      return;
    }

    if (this.canOpenTextFile(file)) {
      this.openPreview(file);
    }
  }

  onMobileLongPress(file: FileSystemObject): void {
    this.toggleSelect(file);
  }

  onMobileShortPress(file: FileSystemObject): void {
    if (this.state.selectedItems().length === 0) {
      if (file.isDir) {
        if (file.isProtected) {
          this.feedbackService.showError('Access denied');
          return;
        }
        void this.loadDirectory(file.path);
      } else if (file.type === 'image' || file.type === 'video') {
        this.openPreview(file);
      } else if (this.canOpenTextFile(file)) {
        this.openPreview(file);
      }
      return;
    }

    this.toggleSelect(file);
  }

  openPreview(file: FileSystemObject): void {
    this.previewFile.set(file);
    this.previewVisible.set(true);
  }

  private canOpenTextFile(file: FileSystemObject): boolean {
    if (file.isProtected) {
      this.feedbackService.showError('Access denied');
      return false;
    }

    if ((file.size ?? 0) > TEXT_FILE_MAX_BYTES) {
      this.feedbackService.showError('File is too large to edit in the browser');
      return false;
    }

    return isEditableTextFile(file);
  }

  async onPreviewSaved(): Promise<void> {
    const currentPath = this.state.currentPath();
    if (currentPath) {
      await this.loadDirectory(currentPath);
    }
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

    const previousSelection = [...this.state.selectedItems()];
    this.state.selectedItems.set([file]);
    await this.downloadSelected();
    this.state.selectedItems.set(previousSelection);
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
    this.state.clipboardItems.set([...this.state.selectedItems()]);
    this.state.clipboardMode.set('copy');
    this.state.clearSelection();
  }

  startMove(): void {
    this.state.clipboardItems.set([...this.state.selectedItems()]);
    this.state.clipboardMode.set('move');
    this.state.clearSelection();
  }

  clearClipboard(): void {
    this.state.clearClipboard();
  }

  async pasteClipboard(overwrite = false): Promise<void> {
    const clipboardItems = this.state.clipboardItems();
    const clipboardMode = this.state.clipboardMode();
    const currentPath = this.state.currentPath();
    if (!clipboardItems.length || !clipboardMode || !currentPath) {
      return;
    }

    try {
      await this.fileSystemService.pasteItems(
        clipboardMode,
        currentPath,
        clipboardItems.map((item) => item.path),
        overwrite
      );
      this.clearClipboard();
      await this.loadDirectory(currentPath);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const files = (error.payload as PasteConflictResponse | undefined)?.files ?? [];
        const confirmed = await this.dialogService.confirm({
          title: 'Overwrite files',
          message: 'The following files already exist. Overwrite them?',
          confirmLabel: 'Overwrite',
          conflictFiles: files,
        });
        if (confirmed) {
          await this.pasteClipboard(true);
        }
        return;
      }

      this.feedbackService.showError(this.extractError(error, 'Paste failed'));
    }
  }

  async deleteSelected(): Promise<void> {
    const selectedItems = this.state.selectedItems();
    if (!selectedItems.length) {
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Delete items',
      message: `Delete ${selectedItems.length} item(s)?`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) {
      return;
    }

    await this.loadingService.withLoading(async () => {
      try {
        await this.fileSystemService.deleteItems(selectedItems.map((item) => item.path));
        await this.loadDirectory(this.state.currentPath());
      } catch (error) {
        this.feedbackService.showError(this.extractError(error, 'Delete failed'));
      }
    });
  }

  async renameSelected(): Promise<void> {
    const item = this.state.selectedItems()[0];
    if (!item) {
      return;
    }

    const newName = await this.dialogService.prompt({
      title: 'Rename',
      label: 'New name',
      initialValue: item.name || getFileName(item),
      confirmLabel: 'Rename',
    });
    if (!newName) {
      return;
    }

    try {
      await this.fileSystemService.renameItem(item.path, newName);
      await this.loadDirectory(this.state.currentPath());
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Rename failed'));
    }
  }

  async createNewFolder(): Promise<void> {
    const currentPath = this.state.currentPath();
    if (!currentPath) {
      return;
    }

    const folderName = await this.dialogService.prompt({
      title: 'New Folder',
      label: 'Folder name',
      confirmLabel: 'Create',
    });
    if (!folderName) {
      return;
    }

    try {
      await this.fileSystemService.createDirectory(currentPath, folderName);
      await this.loadDirectory(currentPath);
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Failed to create folder'));
    }
  }

  async uploadFiles(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async () => {
      const currentPath = this.state.currentPath();
      if (!input.files?.length || !currentPath) {
        return;
      }

      this.uploadVisible.set(true);
      this.uploadProgress.set(0);

      for (const file of Array.from(input.files)) {
        const uploaded = await this.uploadFileWithConflictHandling(currentPath, file);
        if (!uploaded) {
          break;
        }
      }

      this.uploadVisible.set(false);
      await this.loadDirectory(currentPath);
    };

    input.click();
  }

  private async uploadFileWithConflictHandling(
    currentPath: string,
    file: File
  ): Promise<boolean> {
    try {
      await this.uploadService.uploadFile(currentPath, file, {
        onProgress: (percent) => this.uploadProgress.set(percent),
      });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as PasteConflictResponse | undefined;
        const suggestedName = payload?.suggestedName;
        const choice = await this.dialogService.choose({
          title: 'File already exists',
          message: `"${file.name}" already exists in this folder. What would you like to do?`,
          conflictFiles: payload?.files ?? [file.name],
          suggestedName,
        });

        if (choice === 'replace') {
          try {
            await this.uploadService.uploadFile(currentPath, file, {
              onProgress: (percent) => this.uploadProgress.set(percent),
              overwrite: true,
            });
            return true;
          } catch (retryError) {
            this.feedbackService.showError(
              `Upload failed for "${file.name}": ${this.extractError(retryError, 'Upload failed')}`
            );
            return false;
          }
        }

        if (choice === 'rename' && suggestedName) {
          try {
            await this.uploadService.uploadFile(currentPath, file, {
              onProgress: (percent) => this.uploadProgress.set(percent),
              filename: suggestedName,
            });
            return true;
          } catch (retryError) {
            this.feedbackService.showError(
              `Upload failed for "${file.name}": ${this.extractError(retryError, 'Upload failed')}`
            );
            return false;
          }
        }

        return true;
      }

      this.feedbackService.showError(
        `Upload failed for "${file.name}": ${this.extractError(error, 'Upload failed')}`
      );
      return false;
    }
  }

  async downloadSelected(): Promise<void> {
    const selectedItems = this.state.selectedItems();
    if (!selectedItems.length) {
      return;
    }

    const paths = selectedItems.map((item) => item.path);

    try {
      const blob = await this.uploadService.downloadItems(paths);
      const filename = paths.length === 1 ? getFileName(selectedItems[0]) : 'download.zip';
      this.uploadService.triggerDownload(blob, filename);
    } catch (error) {
      this.feedbackService.showError(this.extractError(error, 'Download failed'));
    }
  }

  toggleShowHidden(): void {
    this.state.showHidden.update((value) => !value);
  }

  buildOverflowMenu(): OverflowMenuItem[] {
    const selectionCount = this.state.selectedItems().length;
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
      checked: this.state.showHidden(),
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

  private toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    return this.fileSystemService.toApiError(error);
  }

  private extractError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    return fallback;
  }
}
