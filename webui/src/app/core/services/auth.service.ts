import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from './loading.service';
import { FeedbackService } from './feedback.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isLoggedIn = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly loadingService: LoadingService,
    private readonly feedbackService: FeedbackService
  ) {}

  async checkSession(): Promise<boolean> {
    return this.loadingService.withLoading(async () => {
      try {
        await firstValueFrom(this.http.get('/api/login/is-logged', { withCredentials: true }));
        this.isLoggedIn.set(true);
        return true;
      } catch {
        this.isLoggedIn.set(false);
        return false;
      }
    });
  }

  async login(username: string, password: string): Promise<void> {
    await this.loadingService.withLoading(async () => {
      try {
        await firstValueFrom(
          this.http.post(
            '/api/login',
            { login: username, password },
            { withCredentials: true }
          )
        );
        await this.checkSession();
      } catch (error) {
        this.isLoggedIn.set(false);
        this.feedbackService.showError(this.extractLoginError(error));
      }
    });
  }

  async logoff(): Promise<void> {
    try {
      await firstValueFrom(this.http.get('/api/logoff', { withCredentials: true }));
    } catch {
      this.feedbackService.showError('Failed to log off');
      return;
    }

    this.isLoggedIn.set(false);
  }

  private extractLoginError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { error?: string } }).error;
      if (payload?.error) {
        return payload.error;
      }
    }

    return 'Check your credentials and try again.';
  }
}
