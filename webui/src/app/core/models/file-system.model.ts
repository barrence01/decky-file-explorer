export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export interface FileSystemObject {
  path: string;
  parentPath?: string | null;
  canNavigateUp?: boolean;
  isDir: boolean;
  isFile: boolean;
  isHidden: boolean;
  isProtected?: boolean;
  directory: string;
  name?: string;
  extension?: string;
  size?: number;
  type?: string;
  itemsCount?: number;
}

export interface DirectoryListResponse {
  selectedDir: FileSystemObject;
  selectedDrive: string;
  breadcrumbs: BreadcrumbSegment[];
  dirContent: FileSystemObject[];
}

export interface PasteConflictResponse {
  error: string;
  files: string[];
}

export type ClipboardMode = 'copy' | 'move';
