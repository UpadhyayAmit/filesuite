import { unzipSync, zipSync } from 'fflate';

export type ZipEntry = {
  name: string;
  bytes: Uint8Array;
};

export function zipEntries(entries: readonly ZipEntry[]): Uint8Array {
  return zipSync(
    Object.fromEntries(entries.map((entry) => [entry.name, entry.bytes])),
    { level: 6 },
  );
}

export function unzipEntries(bytes: Uint8Array): ZipEntry[] {
  const output = unzipSync(bytes);
  return Object.entries(output).map(([name, value]) => ({ name, bytes: value }));
}
