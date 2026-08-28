import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private readonly http: HttpClient) {}

  uploadFile(
    path: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const formData = new FormData();
    formData.append('path', path);
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
              onProgress?.(percent);
            }

            if (event.type === HttpEventType.Response) {
              if (event.status && event.status >= 200 && event.status < 300) {
                onProgress?.(100);
                resolve();
              } else {
                reject(this.extractUploadError(event.body));
              }
            }
          },
          error: (error) => {
            reject(this.extractUploadError(error.error) ?? 'Upload failed');
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

  private extractUploadError(payload: unknown): string {
    if (typeof payload === 'object' && payload !== null) {
      const body = payload as { error?: string; message?: string };
      return body.error ?? body.message ?? 'Upload failed';
    }

    return 'Upload failed';
  }
}
