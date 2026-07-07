# WASM Integration Plan

All WASM modules must be served as static assets and loaded inside Web Workers for CPU-heavy work.

## Runtime Pattern

1. UI receives `File` objects from drag/drop.
2. UI validates file size.
3. UI converts files to `ArrayBuffer`.
4. UI transfers buffers to a module worker with `postMessage(..., transferList)`.
5. Worker loads WASM from `/wasm/*.wasm`.
6. Worker writes bytes to the WASM virtual filesystem or passes `ImageData`.
7. Worker transfers the output `ArrayBuffer` back to the UI.
8. UI creates a `Blob` and downloads it with an object URL.
9. Object URLs are revoked; bytes are not persisted.

## PDF

Current worker: `modules/pdf/workers/pdf.worker.ts`.

Library:

- `@neslinesli93/qpdf-wasm`
- Static assets copied to `public/wasm/qpdf.js` and `public/wasm/qpdf.wasm` by `scripts/copy-wasm.mjs`

Merge command:

```ts
qpdf.callMain(['--empty', '--pages', ...inputPaths, '--', outputPath]);
```

Add split:

```ts
qpdf.callMain([inputPath, '--pages', '.', '1-3,5', '--', outputPath]);
```

Add compression/linearization:

```ts
qpdf.callMain([inputPath, '--linearize', '--object-streams=generate', outputPath]);
```

For PDF to image and high-quality text extraction, add MuPDF.js in a dedicated worker. Keep rendering page-by-page and transfer one image result at a time to reduce memory pressure.

For OCR, use Tesseract WASM in its own worker pool. Run OCR on rendered page images, not on the main UI thread.

## Image

Current worker: `modules/image/workers/image.worker.ts`.

Libraries:

- `@jsquash/png`
- `@jsquash/jpeg`
- `@jsquash/webp`

The worker decodes with `createImageBitmap`, optionally resizes with `OffscreenCanvas`, then encodes with jSquash WASM codecs.

For advanced operations, replace the codec-only path with libvips WASM or Rust `image` + `wasm-bindgen`.

## Rust Compile Recipe

```bash
cargo install wasm-pack
wasm-pack build crates/filesuite-image --target web --release --out-dir ../../public/wasm/filesuite-image
```

Expected Rust entry point:

```rust
#[wasm_bindgen]
pub fn transform(input: &[u8], options_json: &str) -> Result<Vec<u8>, JsValue> {
    // decode, process, encode
}
```

Load in a worker:

```ts
const wasm = await import('/wasm/filesuite-image/filesuite_image.js');
await wasm.default('/wasm/filesuite-image/filesuite_image_bg.wasm');
const bytes = wasm.transform(inputBytes, JSON.stringify(options));
```

## C/C++ Compile Recipe

Use Emscripten for libraries such as QPDF, libjpeg-turbo, libwebp, or libpng.

```bash
emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
emcc build/libtool.a -O3 -s MODULARIZE=1 -s EXPORT_ES6=1 -o public/wasm/tool.js
```

Worker loading:

```ts
importScripts('/wasm/tool.js');
const createModule = self.Module;
const module = await createModule({ locateFile: () => '/wasm/tool.wasm' });
```

## Python/Pyodide Rule

Only use Pyodide when a utility cannot reasonably be implemented with TypeScript/Rust/C/C++.

- Load Pyodide as a static asset.
- Disable package downloads at runtime.
- Do not call `micropip.install`.
- Keep execution inside a worker.

## Performance Plan

- Enforce file limits before reading bytes.
- Transfer `ArrayBuffer` ownership to workers instead of copying.
- Process multi-page PDFs page-by-page.
- Use a worker pool sized to `Math.max(1, navigator.hardwareConcurrency - 1)`.
- Prefer streaming/iterative parsing for CSV and archives.
- Revoke all object URLs after download.
- Show progress events for operations above 2 seconds.
- Avoid decoding all images/pages at once on low-memory devices.

## Security Plan

- Static hosting only.
- No API routes, server actions, uploads, cookies, or browser storage.
- CSP allows WASM execution only from self-hosted assets.
- Keep WASM in workers so crashes do not freeze the UI.
- Validate file type and size before dispatch.
- Treat file names as untrusted text; never inject them as HTML.
- Keep third-party WASM pinned and reviewed before upgrade.
