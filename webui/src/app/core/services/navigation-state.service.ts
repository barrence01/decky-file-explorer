import { Injectable, signal } from '@angular/core';
import { BreadcrumbSegment } from '../models/file-system.model';

@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  readonly breadcrumbs = signal<BreadcrumbSegment[]>([]);
  readonly directoryRequest = signal<string | null | undefined>(undefined);

  requestDirectory(path: string | null): void {
    this.directoryRequest.set(undefined);
    this.directoryRequest.set(path);
  }

  setBreadcrumbs(segments: BreadcrumbSegment[]): void {
    this.breadcrumbs.set(segments);
  }

  navigateTo(path: string): void {
    this.requestDirectory(path);
  }
}
