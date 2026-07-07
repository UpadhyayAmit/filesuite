'use client';

import { assertFileSize } from '@/lib/file-limits';
import { createWorkerClient } from '@/lib/worker-client';
import type { ImageConvertOptions, ImageWorkerRequest, ImageWorkerResult } from './types';

const imageClient = createWorkerClient<ImageWorkerRequest, ImageWorkerResult>(
  () => new Worker(new URL('./workers/image.worker.ts', import.meta.url), { type: 'module' }),
);

export async function convertImage(file: File, options: ImageConvertOptions): Promise<Blob> {
  assertFileSize(file, 'image');

  const bytes = await file.arrayBuffer();
  const result = await imageClient.run(
    'image.convert',
    {
      filename: file.name,
      mimeType: file.type,
      bytes,
      options,
    },
    [bytes],
  );

  return new Blob([result.bytes], { type: result.mimeType });
}

export async function imageToBase64(file: File): Promise<string> {
  assertFileSize(file, 'image');
  const buffer = await file.arrayBuffer();
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return `data:${file.type};base64,${btoa(binary)}`;
}

export function base64ToImage(input: string): Blob {
  const [header, base64] = input.includes(',') ? input.split(',', 2) : ['data:image/png;base64', input];
  const mimeType = /data:(.*?);base64/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  return new Blob([bytes], { type: mimeType });
}

export async function resizeImage(file: File, width: number, height: number): Promise<Blob> {
  return convertImage(file, {
    format: mimeToFormat(file.type),
    resize: { width, height },
  });
}

export async function compressImage(file: File, quality = 75): Promise<Blob> {
  return convertImage(file, {
    format: mimeToFormat(file.type),
    quality,
  });
}

export async function mergeImages(_files: readonly File[]): Promise<Blob> {
  throw new Error('Merge images is not exposed yet. Add an image.compose worker task before enabling it in the catalog.');
}

function mimeToFormat(mimeType: string) {
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
  return 'png';
}
