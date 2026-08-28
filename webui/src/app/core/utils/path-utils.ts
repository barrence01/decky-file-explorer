export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function getParentPath(path: string): string | null {
  const normalized = normalizePath(path).replace(/\/+$/, '');
  if (!normalized) {
    return null;
  }

  const windowsDriveMatch = /^([A-Za-z]:)(\/.*)?$/.exec(normalized);
  if (windowsDriveMatch) {
    const drive = windowsDriveMatch[1];
    const remainder = windowsDriveMatch[2] ?? '';
    if (!remainder || remainder === '/') {
      return null;
    }
    const segments = remainder.split('/').filter(Boolean);
    segments.pop();
    return segments.length ? `${drive}/${segments.join('/')}` : drive;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return normalized.startsWith('/') ? '/' : null;
  }
  segments.pop();
  return `/${segments.join('/')}`;
}

export function getFileNameFromPath(path: string): string {
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);
  return segments.pop() ?? normalized;
}
