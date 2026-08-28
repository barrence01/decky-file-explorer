import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiError, ApiErrorResponse } from '../models/api-error.model';
import { UploadConflictResponse } from '../models/file-system.model';

export interface UploadFileOptions {
  onProgress?: (percent: number) => void;
  overwrite?: boolean;
  filename?: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private readonly http: HttpClient) {}

  uploadFile(path: string, file: File, options: UploadFileOptions = {}): Promise<void> {
    const formData = new FormData();
    formData.append('path', path);

    if (options.overwrite) {
      formData.append('overwrite', 'true');
    }

    if (options.filename) {
      formData.append('filename', options.filename);
    }

    formData.append('file', file);

    return new Promise((resolve, reject) => {
      this.http
        .post('/api/dir/upload', formData, {
          withCredentials: true,
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const percent = Math.round((event.loaded / event.total) * 100);
              options.onProgress?.(percent);
            }

            if (event.type === HttpEventType.Response) {
              if (event.status && event.status >= 200 && event.status < 300) {
                options.onProgress?.(100);
                resolve();
              } else {
                reject(this.toUploadError(event.status ?? 0, event.body));
              }
            }
          },
          error: (error: HttpErrorResponse) => {
            reject(this.toUploadError(error.status, error.error));
          },
        });
    });
  }

  async downloadItems(paths: string[]): Promise<Blob> {
    return firstValueFrom(
      this.http.post('/api/dir/download', { paths }, {
        withCredentials: true,
        responseType: 'blob',
      })
    );
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  private toUploadError(status: number, payload: unknown): ApiError | Error {
    if (status === 409 && this.isConflictPayload(payload)) {
      return new ApiError('conflict', 409, payload);
    }

    return new ApiError(this.extractUploadError(payload), status);
  }

  private isConflictPayload(payload: unknown): payload is UploadConflictResponse {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      (payload as UploadConflictResponse).error === 'conflict'
    );
  }

  private extractUploadError(payload: unknown): string {
    if (typeof payload === 'object' && payload !== null) {
      const body = payload as { error?: string; message?: string };
      return body.error ?? body.message ?? 'Upload failed';
    }

    return 'Upload failed';
  }
}
