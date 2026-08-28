export const HIGHLIGHT_FOLDERS = [
  'Downloads',
  'Pictures',
  'Videos',
  'Music',
  'Desktop',
  'Documents',
  'Homebrew',
  'Emudeck',
  'Plugins',
  'Emulation',
  'Applications',
  'Logs',
  'Data',
  'Settings',
  'Favorites',
].map((name) => name.toLowerCase());

export function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

export function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

export function getFileName(file: { path: string; isDir: boolean; name?: string }): string {
  if (!file.isDir && file.name) {
    return file.name;
  }

  if (file.path.includes('\\')) {
    return file.path.split('\\').pop() ?? file.path;
  }

  return file.path.split('/').pop() ?? file.path;
}

export function shouldHighlightFolder(file: { isDir: boolean; path: string }): boolean {
  if (!file.isDir) {
    return false;
  }

  const name = getFileName(file).toLowerCase();
  return HIGHLIGHT_FOLDERS.includes(name);
}

export function getParentPath(path: string | null): string | null {
  if (!path) {
    return null;
  }

  const parts = path.replaceAll('\\', '/').replace(/\/+$/, '').split('/');

  if (path.includes('C:') || path.includes('/home/decky')) {
    if (parts.length <= 3) {
      return null;
    }
  } else if (path.includes(':') || parts.length <= 1) {
    return null;
  }

  parts.pop();
  return parts.join('/') || '/';
}

export function isMobilePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}
