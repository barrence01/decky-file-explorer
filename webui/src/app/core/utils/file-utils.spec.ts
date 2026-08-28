import { shouldHighlightFolder } from './file-utils';

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
