import { Component, ElementRef, Input, OnDestroy, ViewChild, signal } from '@angular/core';

@Component({
  selector: 'app-video-viewer',
  standalone: true,
  template: `
    <div class="video-viewer" #container>
      <video
        #video
        class="video-viewer__media"
        [src]="src"
        controls
        autoplay
        playsinline
        (loadeddata)="loading.set(false)"
        (error)="onError()"
      ></video>
      @if (loading()) {
        <div class="video-viewer__overlay">Loading video...</div>
      }
      @if (loadError()) {
        <div class="video-viewer__overlay video-viewer__overlay--error">Failed to load video</div>
      }
      <div
        class="video-viewer__controls"
        (pointerdown)="$event.stopPropagation()"
        (click)="$event.stopPropagation()"
      >
        <button type="button" (click)="toggleFullscreen()">
          <i class="fas" [class.fa-expand]="!isFullscreen()" [class.fa-compress]="isFullscreen()"></i>
          Fullscreen
        </button>
      </div>
    </div>
  `,
  styles: `
    .video-viewer {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }

    .video-viewer__media {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
    }

    .video-viewer__overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
    }

    .video-viewer__overlay--error {
      color: #f87171;
    }

    .video-viewer__controls {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      pointer-events: auto;
    }

    .video-viewer__controls button {
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `,
})
export class VideoViewerComponent implements OnDestroy {
  @Input({ required: true }) src!: string;

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly isFullscreen = signal(false);

  private readonly onFullscreenChange = (): void => {
    this.isFullscreen.set(document.fullscreenElement === this.containerRef?.nativeElement);
  };

  constructor() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  onError(): void {
    this.loading.set(false);
    this.loadError.set(true);
  }

  toggleFullscreen(): void {
    const container = this.containerRef.nativeElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void container.requestFullscreen();
  }
}
