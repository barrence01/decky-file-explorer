import { FileSystemObject } from '../models/file-system.model';
import { compareFiles, getDisplayName, sortFileSystemObjects } from './sort-utils';

function item(partial: Partial<FileSystemObject> & Pick<FileSystemObject, 'path' | 'isDir'>): FileSystemObject {
  return {
    isFile: !partial.isDir,
    isHidden: false,
    directory: '/home/deck',
    ...partial,
  };
}

describe('getDisplayName', () => {
  it('uses file name when available', () => {
    expect(getDisplayName(item({ path: '/home/deck/readme.txt', isDir: false, name: 'readme.txt' }))).toBe('readme.txt');
  });

  it('derives name from path for directories', () => {
    expect(getDisplayName(item({ path: '/home/deck/docs', isDir: true }))).toBe('docs');
  });
});

describe('sortFileSystemObjects', () => {
  it('places directories before files', () => {
    const files = [
      item({ path: '/home/deck/a.txt', isDir: false, name: 'a.txt' }),
      item({ path: '/home/deck/docs', isDir: true }),
      item({ path: '/home/deck/b.txt', isDir: false, name: 'b.txt' }),
    ];

    const sorted = sortFileSystemObjects(files, 'name', 'asc');

    expect(sorted.map((file) => file.path)).toEqual([
      '/home/deck/docs',
      '/home/deck/a.txt',
      '/home/deck/b.txt',
    ]);
  });

  it('sorts by name ascending', () => {
    const files = [
      item({ path: '/home/deck/z.txt', isDir: false, name: 'z.txt' }),
      item({ path: '/home/deck/a.txt', isDir: false, name: 'a.txt' }),
    ];

    const sorted = sortFileSystemObjects(files, 'name', 'asc');

    expect(sorted.map((file) => file.name)).toEqual(['a.txt', 'z.txt']);
  });

  it('sorts by name descending', () => {
    const files = [
      item({ path: '/home/deck/a.txt', isDir: false, name: 'a.txt' }),
      item({ path: '/home/deck/z.txt', isDir: false, name: 'z.txt' }),
    ];

    const sorted = sortFileSystemObjects(files, 'name', 'desc');

    expect(sorted.map((file) => file.name)).toEqual(['z.txt', 'a.txt']);
  });

  it('sorts by modified date descending', () => {
    const files = [
      item({
        path: '/home/deck/old.txt',
        isDir: false,
        name: 'old.txt',
        modifiedAt: '2026-01-01T00:00:00Z',
      }),
      item({
        path: '/home/deck/new.txt',
        isDir: false,
        name: 'new.txt',
        modifiedAt: '2026-08-01T00:00:00Z',
      }),
    ];

    const sorted = sortFileSystemObjects(files, 'modified', 'desc');

    expect(sorted.map((file) => file.name)).toEqual(['new.txt', 'old.txt']);
  });

  it('sorts by created date ascending', () => {
    const files = [
      item({
        path: '/home/deck/new.txt',
        isDir: false,
        name: 'new.txt',
        createdAt: '2026-08-01T00:00:00Z',
      }),
      item({
        path: '/home/deck/old.txt',
        isDir: false,
        name: 'old.txt',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ];

    const sorted = sortFileSystemObjects(files, 'created', 'asc');

    expect(sorted.map((file) => file.name)).toEqual(['old.txt', 'new.txt']);
  });

  it('uses path as tiebreaker', () => {
    const files = [
      item({ path: '/home/deck/b.txt', isDir: false, name: 'same.txt' }),
      item({ path: '/home/deck/a.txt', isDir: false, name: 'same.txt' }),
    ];

    const sorted = sortFileSystemObjects(files, 'name', 'asc');

    expect(sorted.map((file) => file.path)).toEqual(['/home/deck/a.txt', '/home/deck/b.txt']);
  });
});

describe('compareFiles', () => {
  it('treats missing timestamps as zero', () => {
    const withDate = item({ path: '/home/deck/with.txt', isDir: false, name: 'with.txt', modifiedAt: '2026-08-01T00:00:00Z' });
    const withoutDate = item({ path: '/home/deck/without.txt', isDir: false, name: 'without.txt' });

    expect(compareFiles(withDate, withoutDate, 'modified', 'desc')).toBeLessThan(0);
  });
});
