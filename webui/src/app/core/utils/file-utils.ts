import { getFileNameFromPath } from './path-utils';

const HIGHLIGHT_FOLDER_GROUPS = [
  [
    'Desktop',
    'Área de trabalho',
    'Escritorio',
    'Bureau',
    'Schreibtisch',
    'Scrivania',
  ],
  [
    'Documents',
    'Documentos',
    'Dokumente',
    'Documenti',
  ],
  [
    'Downloads',
    'Transferências',
    'Descargas',
    'Téléchargements',
    'Herunterladen',
    'Download',
  ],
  [
    'Pictures',
    'Imagens',
    'Imágenes',
    'Images',
    'Bilder',
    'Immagini',
  ],
  [
    'Music',
    'Música',
    'Musique',
    'Musik',
    'Musica',
  ],
  [
    'Videos',
    'Vídeos',
    'Vidéos',
    'Video',
  ],
  [
    'Settings',
    'Configurações',
    'Ajustes',
    'Paramètres',
    'Einstellungen',
    'Impostazioni',
  ],
  [
    'Favorites',
    'Favoritos',
    'Favoris',
    'Favoriten',
    'Preferiti',
  ],
  [
    'Applications',
    'Aplicativos',
    'Aplicaciones',
    'Programme',
  ],
  ['Homebrew'],
  ['Emudeck'],
  ['Plugins'],
  ['Emulation'],
  ['Logs'],
  ['Data'],
];

function normalizeFolderName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const HIGHLIGHT_FOLDER_NAMES = new Set(
  HIGHLIGHT_FOLDER_GROUPS.flat().map(normalizeFolderName)
);

export const HIGHLIGHT_FOLDERS = [...HIGHLIGHT_FOLDER_NAMES];

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

  return getFileNameFromPath(file.path);
}

export function shouldHighlightFolder(file: { isDir: boolean; path: string }): boolean {
  if (!file.isDir) {
    return false;
  }

  return HIGHLIGHT_FOLDER_NAMES.has(normalizeFolderName(getFileName(file)));
}

export function isCompactView(): boolean {
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}
