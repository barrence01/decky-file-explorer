import { Component, OnInit, inject, signal, effect, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { FeedbackBarsComponent } from './shared/components/feedback-bars/feedback-bars.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { SidePanelComponent } from './shared/components/side-panel/side-panel.component';
import { DialogHostComponent } from './shared/components/dialog-host/dialog-host.component';
import { NavigationStateService } from './core/services/navigation-state.service';
import { LoadingService } from './core/services/loading.service';
import { isCompactView } from './core/utils/file-utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FeedbackBarsComponent,
    LoadingOverlayComponent,
    SidePanelComponent,
    DialogHostComponent,
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
  readonly isCompactView = isCompactView;

  constructor() {
    effect(() => {
      document.body.classList.toggle('loading', this.loadingService.isLoading());
    });
  }

  ngOnInit(): void {
    void this.bootstrap();
  }

  get mainContentShifted(): boolean {
    return this.sidePanelVisible() && !this.isCompactView();
  }

  get showSidePanelBackdrop(): boolean {
    return this.sidePanelVisible() && this.isCompactView();
  }

  toggleSidePanel(): void {
    this.sidePanelVisible.update((value) => !value);
  }

  closeSidePanel(): void {
    this.sidePanelVisible.set(false);
  }

  onDriveSelected(path: string): void {
    this.closeSidePanel();
    void this.router.navigate(['/files']).then(() => {
      this.navigationState.requestDirectory(path);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidePanelVisible()) {
      this.closeSidePanel();
    }
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
