import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';

@Directive({
  selector: '[appLongPress]',
  standalone: true,
})
export class LongPressDirective {
  @Input() longPressDelay = 500;
  @Output() longPress = new EventEmitter<HTMLElement>();
  @Output() shortPress = new EventEmitter<HTMLElement>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private triggered = false;

  @HostListener('pointerdown')
  onPointerDown(): void {
    this.triggered = false;
    this.timer = setTimeout(() => {
      this.triggered = true;
      this.longPress.emit(this.elementRef.nativeElement);
    }, this.longPressDelay);
  }

  @HostListener('pointerup')
  onPointerUp(): void {
    this.clearTimer();
    if (!this.triggered) {
      this.shortPress.emit(this.elementRef.nativeElement);
    }
  }

  @HostListener('pointerleave')
  onPointerLeave(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
