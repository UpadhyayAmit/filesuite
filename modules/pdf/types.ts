export type PdfMergeInput = {
  files: Array<{
    name: string;
    bytes: ArrayBuffer;
  }>;
};

export type PdfWorkerResult = {
  filename: string;
  mimeType: 'application/pdf';
  bytes: ArrayBuffer;
};

export type PdfWorkerRequest = PdfMergeInput;
