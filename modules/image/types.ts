export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';

export type ImageConvertOptions = {
  format: ImageOutputFormat;
  quality?: number;
  resize?: {
    width: number;
    height: number;
  };
};

export type ImageWorkerRequest = {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
  options: ImageConvertOptions;
};

export type ImageWorkerResult = {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
};
