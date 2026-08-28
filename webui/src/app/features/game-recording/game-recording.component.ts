import { Component, OnInit, inject, signal } from '@angular/core';
import { SteamClip } from '../../core/models/steam-clip.model';
import { GameRecordingService } from '../../core/services/game-recording.service';
import { LoadingService } from '../../core/services/loading.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { FileExplorerStateService } from '../../core/services/file-system.service';
import { NavigationStateService } from '../../core/services/navigation-state.service';
import { ApiError } from '../../core/models/api-error.model';
import { PreviewModalComponent } from '../../shared/components/preview-modal/preview-modal.component';

@Component({
  selector: 'app-game-recording',
  standalone: true,
  imports: [PreviewModalComponent],
  template: `
    <div id="fileView">
      <div class="toolbar" id="toolbar">
        <button class="btn-interactive" type="button" (click)="loadClips()">
          <i class="fas fa-rotate-right"></i>
          <span>Refresh</span>
        </button>
        @if (selectedClip()) {
          <button class="btn-interactive" type="button" (click)="assemble(false)">
            <i class="fas fa-cogs"></i>
            <span>Assemble</span>
          </button>
          <button class="btn-interactive" type="button" (click)="assemble(true)">
            <i class="fas fa-cogs"></i>
            <span>Assemble for browser playback</span>
          </button>
        }
      </div>

      <div class="file-list" id="fileList">
        @for (clip of clips(); track clip.clipId) {
          <div
            class="file-item"
            [class.selected]="selectedClip()?.clipId === clip.clipId"
            (click)="selectClip(clip)"
            (dblclick)="openPreview(clip)"
          >
            <img
              class="clip-thumbnail"
              [src]="gameRecordingService.getThumbnailUrl(clip.clipId)"
              [alt]="clip.clipId"
              (error)="onThumbnailError($event)"
            />
            <div class="file-name">{{ clip.clipId }}</div>
          </div>
        }
      </div>
    </div>

    <app-preview-modal
      [visible]="previewVisible()"
      mode="clip"
      [clipThumbnailUrl]="previewThumbnailUrl()"
      (close)="closePreview()"
    />
  `,
})
export class GameRecordingComponent implements OnInit {
  readonly gameRecordingService = inject(GameRecordingService);
  private readonly loadingService = inject(LoadingService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly state = inject(FileExplorerStateService);
  private readonly navigationState = inject(NavigationStateService);

  readonly clips = signal<SteamClip[]>([]);
  readonly selectedClip = signal<SteamClip | null>(null);
  readonly previewVisible = signal(false);
  readonly previewThumbnailUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.state.clearClipboard();
    this.navigationState.setBreadcrumb('/steam/clips');
    void this.loadClips();
  }

  async loadClips(): Promise<void> {
    await this.loadingService.withLoading(async () => {
      const data = await this.gameRecordingService.listClips();
      this.clips.set(data.clips);
      this.selectedClip.set(null);
    });
  }

  selectClip(clip: SteamClip): void {
    if (this.selectedClip()?.clipId === clip.clipId) {
      this.selectedClip.set(null);
      return;
    }

    this.selectedClip.set(clip);
  }

  openPreview(clip: SteamClip): void {
    this.previewThumbnailUrl.set(this.gameRecordingService.getThumbnailUrl(clip.clipId));
    this.previewVisible.set(true);
  }

  closePreview(): void {
    this.previewVisible.set(false);
    this.previewThumbnailUrl.set(null);
  }

  onThumbnailError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  async assemble(browserCompatible: boolean, overwrite = false): Promise<void> {
    const clip = this.selectedClip();
    if (!clip) {
      return;
    }

    await this.loadingService.withLoading(async () => {
      try {
        await this.gameRecordingService.assembleClip({
          mpd: clip.mpd,
          overwrite,
          browser_compatible: browserCompatible,
        });
        this.state.clearClipboard();
        this.feedbackService.showSuccess(
          "The video has been assembled. You can find it in the 'Videos' folder."
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const confirmed = confirm(
            'The following file already exist in folder. Overwrite them?'
          );
          if (confirmed) {
            await this.assemble(browserCompatible, true);
          }
          return;
        }

        this.feedbackService.showError(this.extractError(error, 'Assemble failed'));
      }
    });
  }

  private extractError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { error?: string } }).error;
      if (payload?.error) {
        return payload.error;
      }
    }

    return fallback;
  }
}
