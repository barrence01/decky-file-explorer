import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  readonly breadcrumb = signal('/');
  readonly directoryRequest = signal<string | null | undefined>(undefined);

  requestDirectory(path: string | null): void {
    this.directoryRequest.set(path);
  }

  setBreadcrumb(path: string): void {
    this.breadcrumb.set(path);
  }
}
