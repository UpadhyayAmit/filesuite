'use client';

import { FILE_LIMITS, assertFileSize, assertTotalSize } from '@/lib/file-limits';
import { createWorkerClient } from '@/lib/worker-client';
import type { PdfWorkerRequest, PdfWorkerResult } from './types';

const pdfClient = createWorkerClient<PdfWorkerRequest, PdfWorkerResult>(
  () => new Worker(new URL('./workers/pdf.worker.ts', import.meta.url)),
);

export async function mergePdfs(files: readonly File[]): Promise<Blob> {
  if (files.length < 2) throw new Error('Select at least two PDFs to merge.');

  files.forEach((file) => assertFileSize(file, 'pdf'));
  assertTotalSize(files, FILE_LIMITS.pdf * 2);

  const inputs = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      bytes: await file.arrayBuffer(),
    })),
  );

  const transfer = inputs.map((input) => input.bytes);
  const result = await pdfClient.run('pdf.merge', { files: inputs }, transfer);

  return new Blob([result.bytes], { type: result.mimeType });
}

export async function splitPdf(_file: File, _ranges: string): Promise<Blob[]> {
  throw new Error('Split PDF API is reserved for the QPDF worker. Add the command in modules/pdf/workers/pdf.worker.ts.');
}

export async function compressPdf(_file: File): Promise<Blob> {
  throw new Error('Compress PDF API is reserved for QPDF/MuPDF WASM. Keep compression in a worker.');
}

export async function pdfToImages(_file: File): Promise<Blob[]> {
  throw new Error('PDF to image API is reserved for MuPDF.js WASM rendering in a worker.');
}

export async function imagesToPdf(_files: readonly File[]): Promise<Blob> {
  throw new Error('Image to PDF API is reserved for the PDF worker.');
}

export async function extractPdfTextOcr(_file: File): Promise<string> {
  throw new Error('OCR API is reserved for Tesseract WASM in a worker.');
}
