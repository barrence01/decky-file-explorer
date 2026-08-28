import { collectDroppedFiles } from './drag-drop-utils';

describe('collectDroppedFiles', () => {
  function createFile(name: string, size = 10, lastModified = 1000): File {
    return new File(['x'.repeat(size)], name, { lastModified });
  }

  function createDataTransfer(files: File[], items?: DataTransferItem[]): DataTransfer {
    return {
      files: {
        length: files.length,
        item: (index: number) => files[index] ?? null,
        [Symbol.iterator]: function* () {
          for (const file of files) {
            yield file;
          }
        },
      } as FileList,
      items: items ?? [],
    } as unknown as DataTransfer;
  }

  it('collects files from DataTransfer.files', () => {
    const files = [createFile('a.txt'), createFile('b.txt')];
    const dataTransfer = createDataTransfer(files);

    const result = collectDroppedFiles(dataTransfer);

    expect(result.length).toBe(2);
    expect(result.map((file: File) => file.name)).toEqual(['a.txt', 'b.txt']);
  });

  it('collects files via getAsFile when files list is empty', () => {
    const file = createFile('archive.zip');
    const items = [
      {
        kind: 'file',
        type: 'application/zip',
        getAsFile: () => file,
      } as unknown as DataTransferItem,
    ];
    const dataTransfer = createDataTransfer([], items);

    const result = collectDroppedFiles(dataTransfer);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('archive.zip');
  });

  it('deduplicates identical files', () => {
    const file = createFile('duplicate.txt', 5, 2000);
    const dataTransfer = createDataTransfer([file, file]);

    const result = collectDroppedFiles(dataTransfer);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('duplicate.txt');
  });

  it('returns empty list when no files are present', () => {
    const dataTransfer = createDataTransfer([]);

    expect(collectDroppedFiles(dataTransfer)).toEqual([]);
  });
});
