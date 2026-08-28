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

const EDITABLE_TEXT_EXTENSIONS = new Set([
  'json',
  'jsonc',
  'json5',
  'html',
  'htm',
  'xhtml',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'xml',
  'xsl',
  'xslt',
  'svg',
  'md',
  'markdown',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'config',
  'txt',
  'text',
  'log',
  'py',
  'sh',
  'bash',
  'zsh',
  'sql',
  'csv',
  'env',
  'vue',
  'svelte',
  'php',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'lua',
  'pl',
  'bat',
  'cmd',
  'ps1',
  'rst',
  'properties',
]);

const EDITABLE_TEXT_FILENAMES = new Set([
  'dockerfile',
  'makefile',
  'gemfile',
  'rakefile',
  '.gitignore',
  '.editorconfig',
  '.env',
  '.npmrc',
]);

function getFileExtension(file: { extension?: string; path: string; name?: string }): string {
  if (file.extension) {
    return file.extension.replace(/^\./, '').toLowerCase();
  }

  const fileName = getFileNameFromPath(file.path);
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) {
    return '';
  }

  return fileName.slice(dotIndex + 1).toLowerCase();
}

/**
 * Returns whether a file should open in the in-browser text editor.
 */
export function isEditableTextFile(file: {
  isDir: boolean;
  type?: string;
  extension?: string;
  path: string;
  name?: string;
}): boolean {
  if (file.isDir) {
    return false;
  }

  if (file.type === 'text') {
    return true;
  }

  const extension = getFileExtension(file);
  if (extension && EDITABLE_TEXT_EXTENSIONS.has(extension)) {
    return true;
  }

  const fileName = getFileName(file).toLowerCase();
  return EDITABLE_TEXT_FILENAMES.has(fileName);
}

export function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

export function truncateStringStart(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `...${value.slice(-(maxLength - 3))}`;
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
