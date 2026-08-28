import { SortDirection, SortField } from '../../../core/models/file-system.model';

export interface ToolbarActions {
  canNavigateUp: boolean;
  hasSelection: boolean;
  selectionCount: number;
  clipboardActive: boolean;
  clipboardCount: number;
  showHidden: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
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
  onSortFieldChange(field: SortField): void;
  onToggleSortDirection(): void;
  onSetSortDirection(direction: SortDirection): void;
  onPaste(): void;
  onClearClipboard(): void;
}

export interface OverflowMenuItem {
  label: string;
  action: () => void;
  checked?: boolean;
  openSortSheet?: boolean;
}
