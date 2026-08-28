import { FileSystemObject, SortDirection, SortField } from '../models/file-system.model';
import { getFileNameFromPath } from './path-utils';

export function getDisplayName(file: FileSystemObject): string {
  return file.name ?? getFileNameFromPath(file.path);
}

export function getSortTimestamp(file: FileSystemObject, field: 'modified' | 'created'): number {
  const value = field === 'modified' ? file.modifiedAt : file.createdAt;
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareFiles(
  a: FileSystemObject,
  b: FileSystemObject,
  field: SortField,
  direction: SortDirection
): number {
  if (a.isDir !== b.isDir) {
    return a.isDir ? -1 : 1;
  }

  let result = 0;

  if (field === 'name') {
    result = getDisplayName(a).localeCompare(getDisplayName(b), undefined, { sensitivity: 'base' });
  } else {
    result = getSortTimestamp(a, field) - getSortTimestamp(b, field);
  }

  if (result === 0) {
    result = a.path.localeCompare(b.path);
  }

  return direction === 'asc' ? result : -result;
}

export function sortFileSystemObjects(
  items: FileSystemObject[],
  field: SortField,
  direction: SortDirection
): FileSystemObject[] {
  return [...items].sort((a, b) => compareFiles(a, b, field, direction));
}
