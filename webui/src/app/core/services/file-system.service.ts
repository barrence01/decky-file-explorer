import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ClipboardMode,
  DirectoryListResponse,
  FileSystemObject,
  PasteConflictResponse,
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

  createDirectory(path: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/dir/create',
        { path },
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
  currentPath: string | null = null;
  selectedDir: FileSystemObject | null = null;
  dirContent: FileSystemObject[] = [];
  selectedItems: FileSystemObject[] = [];
  clipboardItems: FileSystemObject[] = [];
  clipboardMode: ClipboardMode | null = null;
  showHidden = false;

  clearClipboard(): void {
    this.clipboardItems = [];
    this.clipboardMode = null;
    this.selectedItems = [];
  }

  clearSelection(): void {
    this.selectedItems = [];
  }
}
