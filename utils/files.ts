export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export async function fileToText(file: File): Promise<string> {
  return file.text();
}

export function toDownloadName(inputName: string, suffix: string, extension: string): string {
  const base = inputName.replace(/\.[^.]+$/, '');
  return `${base}-${suffix}.${extension.replace(/^\./, '')}`;
}
