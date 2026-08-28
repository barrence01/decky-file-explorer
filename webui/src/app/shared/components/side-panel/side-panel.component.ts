import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FileExplorerStateService } from '../../../core/services/file-system.service';
import { NavigationStateService } from '../../../core/services/navigation-state.service';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  template: `
    <div class="side-panel" [class.visible]="visible">
      @if (authService.isLoggedIn()) {
        <div id="side-panel-content">
          <button type="button" (click)="logoff()">
            <i class="fas fa-sign-out-alt"></i> Logoff
          </button>
          <ul>
            <button type="button" (click)="navigateHome()">Home</button>
            <button type="button" (click)="navigateRecordings()">Steam - Game Recording</button>
          </ul>
        </div>
      }
    </div>
  `,
})
export class SidePanelComponent {
  @Input() visible = false;
  @Output() closePanel = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly state = inject(FileExplorerStateService);
  private readonly navigationState = inject(NavigationStateService);

  navigateHome(): void {
    this.state.clearClipboard();
    this.closePanel.emit();
    void this.router.navigate(['/files']).then(() => {
      this.navigationState.requestDirectory(null);
    });
  }

  navigateRecordings(): void {
    this.state.clearClipboard();
    this.closePanel.emit();
    void this.router.navigate(['/recordings']);
  }

  async logoff(): Promise<void> {
    this.state.clearClipboard();
    this.state.currentPath.set(null);
    await this.authService.logoff();
    this.closePanel.emit();
    void this.router.navigate(['/login']);
  }
}
