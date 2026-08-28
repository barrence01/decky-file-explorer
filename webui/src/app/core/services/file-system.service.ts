import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ClipboardMode,
  DirectoryListResponse,
  FileSystemObject,
  TextFileContentResponse,
} from '../models/file-system.model';
import { ApiError, ApiErrorResponse } from '../models/api-error.model';

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
    ).catch((error) => {
      throw this.toApiError(error);
    });
  }

  deleteItems(paths: string[]): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/dir/delete',
        { paths },
        { withCredentials: true }
      )
    ).catch((error) => {
      throw this.toApiError(error);
    });
  }

  renameItem(path: string, newName: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/file/rename',
        { path, newName },
        { withCredentials: true }
      )
    ).catch((error) => {
      throw this.toApiError(error);
    });
  }

  createDirectory(parentPath: string, name: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(
        '/api/dir/create',
        { parentPath, name },
        { withCredentials: true }
      )
    ).catch((error) => {
      throw this.toApiError(error);
    });
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
      const apiError = this.toApiError(error);
      if (apiError.status === 409) {
        throw new ApiError('conflict', 409, apiError.payload);
      }
      throw apiError;
    }
  }

  getFileViewUrl(path: string): string {
    return `/api/file/view?path=${encodeURIComponent(path)}`;
  }

  readTextFile(path: string): Promise<TextFileContentResponse> {
    return firstValueFrom(
      this.http.get<TextFileContentResponse>(
        `/api/file/text?path=${encodeURIComponent(path)}`,
        { withCredentials: true }
      )
    ).catch((error) => {
      throw this.toApiError(error);
    });
  }

  saveTextFile(path: string, content: string): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.put<{ status: string }>(
        '/api/file/text',
        { path, content },
        { withCredentials: true }
      )
    ).catch((error) => {
      throw this.toApiError(error);
    });
  }

  toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      const payload = (error.error ?? {}) as ApiErrorResponse;
      const message = payload.error || error.message || 'Request failed';
      return new ApiError(message, error.status, payload);
    }

    if (error instanceof Error) {
      return new ApiError(error.message, 0);
    }

    return new ApiError('Request failed', 0);
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
