import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-overlay">
        <div class="spinner"></div>
      </div>
    }
  `,
})
export class LoadingOverlayComponent {
  readonly loadingService = inject(LoadingService);
}
