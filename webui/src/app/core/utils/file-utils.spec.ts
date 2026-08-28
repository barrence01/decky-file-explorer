import { isEditableTextFile, shouldHighlightFolder } from './file-utils';

describe('shouldHighlightFolder', () => {
  function folder(path: string) {
    return { isDir: true, path };
  }

  function file(path: string) {
    return { isDir: false, path };
  }

  it('highlights English Desktop folder', () => {
    expect(shouldHighlightFolder(folder('/home/deck/Desktop'))).toBeTrue();
  });

  it('highlights Portuguese Desktop folder', () => {
    expect(shouldHighlightFolder(folder('/home/deck/Área de trabalho'))).toBeTrue();
  });

  it('highlights Desktop folder without accents', () => {
    expect(shouldHighlightFolder(folder('/home/deck/area de trabalho'))).toBeTrue();
  });

  it('highlights Spanish Documents folder', () => {
    expect(shouldHighlightFolder(folder('/home/deck/Documentos'))).toBeTrue();
  });

  it('highlights Portuguese Downloads folder', () => {
    expect(shouldHighlightFolder(folder('/home/deck/Transferências'))).toBeTrue();
  });

  it('highlights app-specific folders', () => {
    expect(shouldHighlightFolder(folder('/home/deck/Emudeck'))).toBeTrue();
    expect(shouldHighlightFolder(folder('/home/deck/Homebrew'))).toBeTrue();
  });

  it('does not highlight unknown folders', () => {
    expect(shouldHighlightFolder(folder('/home/deck/RandomFolder'))).toBeFalse();
  });

  it('does not highlight files', () => {
    expect(shouldHighlightFolder(file('/home/deck/Desktop/readme.txt'))).toBeFalse();
  });
});

describe('isEditableTextFile', () => {
  function editableFile(path: string, extension?: string, type?: string) {
    return { isDir: false, path, extension, type };
  }

  it('accepts plain text files by mime type', () => {
    expect(isEditableTextFile(editableFile('/home/deck/readme.txt', '.txt', 'text'))).toBeTrue();
  });

  it('accepts json files by extension', () => {
    expect(isEditableTextFile(editableFile('/home/deck/config.json', '.json', 'application'))).toBeTrue();
  });

  it('accepts html and css files by extension', () => {
    expect(isEditableTextFile(editableFile('/home/deck/index.html', '.html', 'text'))).toBeTrue();
    expect(isEditableTextFile(editableFile('/home/deck/styles.css', '.css', 'text'))).toBeTrue();
  });

  it('accepts extensionless dockerfile by filename', () => {
    expect(isEditableTextFile(editableFile('/home/deck/Dockerfile'))).toBeTrue();
  });

  it('rejects binary files', () => {
    expect(isEditableTextFile(editableFile('/home/deck/photo.png', '.png', 'image'))).toBeFalse();
  });

  it('rejects directories', () => {
    expect(isEditableTextFile({ isDir: true, path: '/home/deck/docs' })).toBeFalse();
  });
});
