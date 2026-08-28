import { Component, inject } from '@angular/core';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-bars',
  standalone: true,
  template: `
    @if (feedbackService.errorMessage(); as message) {
      <div class="error-bar">{{ message }}</div>
    }
    @if (feedbackService.successMessage(); as message) {
      <div class="success-bar">{{ message }}</div>
    }
  `,
})
export class FeedbackBarsComponent {
  readonly feedbackService = inject(FeedbackService);
}
