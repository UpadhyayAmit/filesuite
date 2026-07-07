export const MB = 1024 * 1024;

export const FILE_LIMITS = {
  pdf: 80 * MB,
  image: 40 * MB,
  calendar: 5 * MB,
  text: 10 * MB,
  spreadsheet: 35 * MB,
  archive: 100 * MB,
} as const;

export type FileLimitKind = keyof typeof FILE_LIMITS;

export function assertFileSize(file: File, kind: FileLimitKind): void {
  const limit = FILE_LIMITS[kind];

  if (file.size > limit) {
    throw new Error(`${file.name} is ${formatBytes(file.size)}. The ${kind} limit is ${formatBytes(limit)}.`);
  }
}

export function assertTotalSize(files: readonly File[], limitBytes: number): void {
  const total = files.reduce((sum, file) => sum + file.size, 0);

  if (total > limitBytes) {
    throw new Error(`Selected files total ${formatBytes(total)}. The limit is ${formatBytes(limitBytes)}.`);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
