import { Directive, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { collectDroppedFiles } from '../../core/utils/drag-drop-utils';

@Directive({
  selector: '[appFileDrop]',
  standalone: true,
})
export class FileDropDirective {
  @Input() fileDropDisabled = false;
  @Output() filesDropped = new EventEmitter<File[]>();
  @Output() dragActiveChange = new EventEmitter<boolean>();

  private dragDepth = 0;

  @HostListener('document:dragover', ['$event'])
  onDocumentDragOver(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }

    event.preventDefault();
    if (!this.fileDropDisabled && event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('document:drop', ['$event'])
  onDocumentDrop(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = 0;
    this.dragActiveChange.emit(false);

    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      return;
    }

    const files = collectDroppedFiles(dataTransfer);
    this.filesDropped.emit(files);
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    if (this.fileDropDisabled || !this.hasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragDepth += 1;
    this.dragActiveChange.emit(true);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    if (this.fileDropDisabled || !this.hasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    if (this.fileDropDisabled || !this.hasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragActiveChange.emit(false);
    }
  }

  private hasFiles(event: DragEvent): boolean {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      return false;
    }

    if (dataTransfer.types?.length) {
      const types = Array.from(dataTransfer.types);
      if (
        types.includes('Files') ||
        types.includes('application/x-moz-file') ||
        types.some((type) => type.toLowerCase() === 'files')
      ) {
        return true;
      }
    }

    if (dataTransfer.items?.length) {
      return Array.from(dataTransfer.items).some((item) => item.kind === 'file');
    }

    return (dataTransfer.files?.length ?? 0) > 0;
  }
}
