export interface ToolbarActions {
  canNavigateUp: boolean;
  hasSelection: boolean;
  selectionCount: number;
  clipboardActive: boolean;
  clipboardCount: number;
  showHidden: boolean;
  onUp(): void;
  onRefresh(): void;
  onUpload(): void;
  onMove(): void;
  onCopy(): void;
  onDownload(): void;
  onDelete(): void;
  onRename(): void;
  onNewFolder(): void;
  onProperties(): void;
  onToggleHidden(): void;
  onPaste(): void;
  onClearClipboard(): void;
}

export interface OverflowMenuItem {
  label: string;
  action: () => void;
  checked?: boolean;
}
