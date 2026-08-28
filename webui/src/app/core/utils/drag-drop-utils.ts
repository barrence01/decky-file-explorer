function deduplicateFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const unique: File[] = [];

  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(file);
  }

  return unique;
}

export function collectDroppedFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];

  if (dataTransfer.files?.length) {
    return deduplicateFiles(Array.from(dataTransfer.files));
  }

  if (files.length === 0 && dataTransfer.items?.length) {
    for (let index = 0; index < dataTransfer.items.length; index += 1) {
      const item = dataTransfer.items[index];
      if (item.kind !== 'file') {
        continue;
      }

      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  return deduplicateFiles(files);
}
