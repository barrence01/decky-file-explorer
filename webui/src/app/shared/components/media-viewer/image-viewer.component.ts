import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  template: `
    <div
      class="image-viewer"
      #container
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (wheel)="onWheel($event)"
      (dblclick)="resetView()"
    >
      <img
        #image
        class="image-viewer__media"
        [src]="src"
        [alt]="alt"
        [style.transform]="transform()"
        (load)="onImageLoad()"
        (error)="loadError.set(true)"
      />
      @if (loadError()) {
        <div class="image-viewer__error">Failed to load image</div>
      }
      <div class="image-viewer__controls">
        <button type="button" (click)="zoomOut()"><i class="fas fa-minus"></i></button>
        <button type="button" (click)="resetView()"><i class="fas fa-compress"></i></button>
        <button type="button" (click)="zoomIn()"><i class="fas fa-plus"></i></button>
      </div>
    </div>
  `,
  styles: `
    .image-viewer {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
    }

    .image-viewer:active {
      cursor: grabbing;
    }

    .image-viewer__media {
      max-width: 100%;
      max-height: 100%;
      transform-origin: center center;
      user-select: none;
      pointer-events: none;
    }

    .image-viewer__error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f87171;
    }

    .image-viewer__controls {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px;
      border-radius: 999px;
    }

    .image-viewer__controls button {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: #374151;
      color: #fff;
      cursor: pointer;
    }
  `,
})
export class ImageViewerComponent {
  @Input({ required: true }) src!: string;
  @Input() alt = '';

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  readonly loadError = signal(false);
  readonly transform = signal('translate(0px, 0px) scale(1)');

  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private activePointers = new Map<number, { x: number; y: number }>();
  private panStart: { x: number; y: number; tx: number; ty: number } | null = null;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;

  onImageLoad(): void {
    this.loadError.set(false);
    this.resetView();
  }

  zoomIn(): void {
    this.setScale(this.scale * 1.25);
  }

  zoomOut(): void {
    this.setScale(this.scale / 1.25);
  }

  resetView(): void {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1.1 : 0.9;
    this.setScale(this.scale * delta);
  }

  onPointerDown(event: PointerEvent): void {
    this.containerRef.nativeElement.setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 1) {
      this.panStart = {
        x: event.clientX,
        y: event.clientY,
        tx: this.translateX,
        ty: this.translateY,
      };
    }

    if (this.activePointers.size === 2) {
      this.pinchStartDistance = this.getPointersDistance();
      this.pinchStartScale = this.scale;
      this.panStart = null;
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 2) {
      const distance = this.getPointersDistance();
      if (this.pinchStartDistance > 0) {
        this.setScale(this.pinchStartScale * (distance / this.pinchStartDistance));
      }
      return;
    }

    if (this.panStart && this.scale > 1) {
      this.translateX = this.panStart.tx + (event.clientX - this.panStart.x);
      this.translateY = this.panStart.ty + (event.clientY - this.panStart.y);
      this.updateTransform();
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.pinchStartDistance = 0;
    }
    if (this.activePointers.size === 0) {
      this.panStart = null;
    }
  }

  private getPointersDistance(): number {
    const points = [...this.activePointers.values()];
    if (points.length < 2) {
      return 0;
    }
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.hypot(dx, dy);
  }

  private setScale(nextScale: number): void {
    this.scale = Math.min(8, Math.max(1, nextScale));
    if (this.scale === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
    this.updateTransform();
  }

  private updateTransform(): void {
    this.transform.set(
      `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
    );
  }
}
