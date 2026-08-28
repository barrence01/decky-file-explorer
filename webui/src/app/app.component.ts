import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { FeedbackBarsComponent } from './shared/components/feedback-bars/feedback-bars.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { SidePanelComponent } from './shared/components/side-panel/side-panel.component';
import { NavigationStateService } from './core/services/navigation-state.service';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FeedbackBarsComponent,
    LoadingOverlayComponent,
    SidePanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly navigationState = inject(NavigationStateService);
  private readonly loadingService = inject(LoadingService);

  readonly sidePanelVisible = signal(false);
  readonly mainContentShifted = signal(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle('loading', this.loadingService.isLoading());
    });
  }

  ngOnInit(): void {
    void this.bootstrap();
  }

  toggleSidePanel(): void {
    this.sidePanelVisible.update((value) => !value);
    this.mainContentShifted.update((value) => !value);
  }

  closeSidePanel(): void {
    this.sidePanelVisible.set(false);
    this.mainContentShifted.set(false);
  }

  onDriveSelected(path: string): void {
    void this.router.navigate(['/files']).then(() => {
      this.navigationState.requestDirectory(path);
    });
  }

  private async bootstrap(): Promise<void> {
    const loggedIn = await this.authService.checkSession();
    if (loggedIn) {
      await this.router.navigate(['/files']);
      return;
    }

    await this.router.navigate(['/login']);
  }
}
