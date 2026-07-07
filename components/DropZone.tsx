'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

type DropZoneProps = {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
};

export function DropZone({ accept, multiple = true, onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
        isDragging ? 'border-coral bg-coral/10' : 'border-line bg-white'
      }`}
    >
      <Upload className="mb-3 h-6 w-6 text-sage" aria-hidden="true" />
      <p className="text-sm font-semibold text-ink">Drop files here</p>
      <p className="mt-1 text-sm text-muted">or choose files from this device</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink"
      >
        Select files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => onFiles([...(event.currentTarget.files ?? [])])}
      />
    </div>
  );
}
