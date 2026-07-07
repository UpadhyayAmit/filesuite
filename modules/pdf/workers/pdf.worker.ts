import type { WorkerEnvelope, WorkerFailure, WorkerSuccess } from '@/lib/worker-client';
import type { PdfWorkerRequest, PdfWorkerResult } from '../types';

declare const self: DedicatedWorkerGlobalScope;

type QpdfModule = {
  FS: {
    mkdir(path: string): void;
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
  callMain(args: string[]): void;
};

type QpdfFactory = (options: unknown) => Promise<QpdfModule>;
type QpdfGlobal = DedicatedWorkerGlobalScope & {
  Module?: QpdfFactory;
};

let qpdfFactoryPromise: Promise<QpdfFactory> | null = null;

self.onmessage = async (event: MessageEvent<WorkerEnvelope<PdfWorkerRequest>>) => {
  const { id, type, payload } = event.data;

  try {
    if (type !== 'pdf.merge') throw new Error(`Unknown PDF worker task: ${type}`);

    const result = await mergeWithQpdf(payload);
    postSuccess(id, result, [result.bytes]);
  } catch (error) {
    postFailure(id, error instanceof Error ? error.message : 'PDF processing failed.');
  }
};

async function mergeWithQpdf(input: PdfWorkerRequest): Promise<PdfWorkerResult> {
  const createModule = await loadQpdfFactory();
  const qpdf = await createModule({
    locateFile: () => '/wasm/qpdf.wasm',
    noInitialRun: true,
  });

  safeMkdir(qpdf, '/input');
  safeMkdir(qpdf, '/output');

  const inputPaths = input.files.map((file, index) => {
    const path = `/input/${index}.pdf`;
    qpdf.FS.writeFile(path, new Uint8Array(file.bytes));
    return path;
  });
  const outputPath = '/output/merged.pdf';

  const pageArgs = inputPaths.flatMap((path) => [path, '1-z']);
  qpdf.callMain(['--empty', '--pages', ...pageArgs, '--', outputPath]);

  const output = qpdf.FS.readFile(outputPath);

  for (const path of inputPaths) qpdf.FS.unlink(path);
  qpdf.FS.unlink(outputPath);

  return {
    filename: 'merged.pdf',
    mimeType: 'application/pdf',
    bytes: toPlainArrayBuffer(output),
  };
}

async function loadQpdfFactory(): Promise<QpdfFactory> {
  qpdfFactoryPromise ??= new Promise<QpdfFactory>((resolve, reject) => {
    try {
      self.importScripts('/wasm/qpdf.js');
      const factory = (self as QpdfGlobal).Module;
      if (!factory) throw new Error('QPDF WASM loader did not expose Module.');
      resolve(factory);
    } catch (error) {
      reject(error);
    }
  });

  return qpdfFactoryPromise;
}

function safeMkdir(qpdf: QpdfModule, path: string): void {
  try {
    qpdf.FS.mkdir(path);
  } catch {
    // Directory already exists in the module virtual filesystem.
  }
}

function postSuccess(id: string, result: PdfWorkerResult, transfer: Transferable[]): void {
  self.postMessage({ id, ok: true, result } satisfies WorkerSuccess<PdfWorkerResult>, transfer);
}

function postFailure(id: string, error: string): void {
  self.postMessage({ id, ok: false, error } satisfies WorkerFailure);
}

function toPlainArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  return output.buffer;
}
