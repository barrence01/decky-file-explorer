import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ClipboardMode,
  DirectoryListResponse,
  FileSystemObject,
} from '../models/file-system.model';
import { ApiError } from '../models/api-error.model';

@Injectable({ providedIn: 'root' })
export class FileSystemService {
  constructor(private readonly http: HttpClient) {}

  listDirectory(path?: string | null): Promise<DirectoryListResponse> {
    return firstValueFrom(
      this.http.post<DirectoryListResponse>(
        '/api/dir/list',
        { path },
        { withCredentials: true }
      )
    );
  }

  deleteItems(paths: string[]): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/dir/delete',
        { paths },
        { withCredentials: true }
      )
    );
  }

  renameItem(path: string, newName: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/file/rename',
        { path, newName },
        { withCredentials: true }
      )
    );
  }

  createDirectory(parentPath: string, name: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/dir/create',
        { parentPath, name },
        { withCredentials: true }
      )
    );
  }

  async pasteItems(
    mode: ClipboardMode,
    targetDir: string,
    paths: string[],
    overwrite = false
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<{ status: string }>(
          '/api/dir/paste',
          { mode, targetDir, paths, overwrite },
          { withCredentials: true }
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        throw new ApiError('conflict', 409, error.error);
      }
      throw error;
    }
  }

  getFileViewUrl(path: string): string {
    return `/api/file/view?path=${encodeURIComponent(path)}`;
  }
}

@Injectable({ providedIn: 'root' })
export class FileExplorerStateService {
  readonly currentPath = signal<string | null>(null);
  readonly selectedDir = signal<FileSystemObject | null>(null);
  readonly dirContent = signal<FileSystemObject[]>([]);
  readonly selectedItems = signal<FileSystemObject[]>([]);
  readonly clipboardItems = signal<FileSystemObject[]>([]);
  readonly clipboardMode = signal<ClipboardMode | null>(null);
  readonly showHidden = signal(false);

  clearClipboard(): void {
    this.clipboardItems.set([]);
    this.clipboardMode.set(null);
    this.selectedItems.set([]);
  }

  clearSelection(): void {
    this.selectedItems.set([]);
  }
}
