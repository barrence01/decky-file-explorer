export interface FileSystemObject {
  path: string;
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
  dirContent: FileSystemObject[];
}

export interface PasteConflictResponse {
  error: string;
  files: string[];
}

export type ClipboardMode = 'copy' | 'move';
