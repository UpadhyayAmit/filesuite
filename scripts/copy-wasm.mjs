import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const appRoot = join(root, '..');
const publicWasm = join(appRoot, 'public', 'wasm');

mkdirSync(publicWasm, { recursive: true });

const copies = [
  {
    from: join(appRoot, 'node_modules', '@neslinesli93', 'qpdf-wasm', 'dist', 'qpdf.js'),
    to: join(publicWasm, 'qpdf.js'),
  },
  {
    from: join(appRoot, 'node_modules', '@neslinesli93', 'qpdf-wasm', 'dist', 'qpdf.wasm'),
    to: join(publicWasm, 'qpdf.wasm'),
  },
  {
    from: join(appRoot, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    to: join(publicWasm, 'sql-wasm.wasm'),
  },
  {
    from: join(appRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
    to: join(publicWasm, 'pdf.worker.min.mjs'),
  },
];

for (const item of copies) {
  if (existsSync(item.from)) {
    copyFileSync(item.from, item.to);
    console.log(`copied ${item.to}`);
  }
}

const publicPyodide = join(appRoot, 'public', 'pyodide');
mkdirSync(publicPyodide, { recursive: true });

for (const filename of ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  const from = join(appRoot, 'node_modules', 'pyodide', filename);
  const to = join(publicPyodide, filename);

  if (existsSync(from)) {
    copyFileSync(from, to);
    console.log(`copied ${to}`);
  }
}
