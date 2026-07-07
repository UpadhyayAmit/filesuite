import type { WorkerEnvelope, WorkerFailure, WorkerSuccess } from '@/lib/worker-client';
import type { ImageWorkerRequest, ImageWorkerResult } from '../types';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerEnvelope<ImageWorkerRequest>>) => {
  const { id, type, payload } = event.data;

  try {
    if (type !== 'image.convert') throw new Error(`Unknown image worker task: ${type}`);

    const result = await convert(payload);
    self.postMessage({ id, ok: true, result } satisfies WorkerSuccess<ImageWorkerResult>, [result.bytes]);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Image processing failed.',
    } satisfies WorkerFailure);
  }
};

async function convert(input: ImageWorkerRequest): Promise<ImageWorkerResult> {
  const blob = new Blob([input.bytes], { type: input.mimeType });
  let bitmap = await createImageBitmap(blob);

  if (input.options.resize) {
    bitmap = await resizeBitmap(bitmap, input.options.resize.width, input.options.resize.height);
  }

  const imageData = await bitmapToImageData(bitmap);
  const encoded = await encodeWithWasm(imageData, input.options.format, input.options.quality);
  const mimeType = `image/${input.options.format === 'jpeg' ? 'jpeg' : input.options.format}`;

  return {
    filename: replaceExtension(input.filename, input.options.format === 'jpeg' ? 'jpg' : input.options.format),
    mimeType,
    bytes: toPlainArrayBuffer(encoded),
  };
}

async function resizeBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot create an offscreen image context.');

  context.drawImage(bitmap, 0, 0, width, height);
  return createImageBitmap(canvas);
}

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot read image pixels off the UI thread.');

  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

async function encodeWithWasm(imageData: ImageData, format: string, quality = 85): Promise<Uint8Array> {
  if (format === 'webp') {
    const { encode } = await import('@jsquash/webp');
    return new Uint8Array(await encode(imageData, { quality }));
  }

  if (format === 'jpeg') {
    const { encode } = await import('@jsquash/jpeg');
    return new Uint8Array(await encode(imageData, { quality }));
  }

  const { encode } = await import('@jsquash/png');
  return new Uint8Array(await encode(imageData));
}

function replaceExtension(filename: string, extension: string): string {
  return `${filename.replace(/\.[^.]+$/, '')}.${extension}`;
}

function toPlainArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  return output.buffer;
}
