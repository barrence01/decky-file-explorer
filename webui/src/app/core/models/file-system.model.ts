export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export type SortField = 'name' | 'modified' | 'created';
export type SortDirection = 'asc' | 'desc';

export interface FileSystemObject {
  path: string;
  parentPath?: string | null;
  canNavigateUp?: boolean;
  isDir: boolean;
  isFile: boolean;
  isHidden: boolean;
  isProtected?: boolean;
  isWritable?: boolean;
  directory: string;
  name?: string;
  extension?: string;
  size?: number;
  type?: string;
  itemsCount?: number;
  modifiedAt?: string;
  createdAt?: string;
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
  suggestedName?: string;
}

export type UploadConflictResponse = PasteConflictResponse;

export interface TextFileContentResponse {
  content: string;
  size: number;
  maxBytes: number;
  isWritable: boolean;
}

export type ClipboardMode = 'copy' | 'move';
