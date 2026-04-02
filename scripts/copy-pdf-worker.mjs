import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const targetDir = resolve('public');
const target = resolve('public', 'pdf.worker.min.js');
const pdfiumSource = resolve('node_modules', '@embedpdf', 'pdfium', 'dist', 'pdfium.wasm');
const pdfiumTarget = resolve('public', 'pdfium.wasm');

if (existsSync(source)) {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  copyFileSync(source, target);
  console.log('Copied pdf.worker.min.js to public/.');
} else {
  console.warn('pdf.worker.min.js not found in node_modules; skipping copy.');
}

if (existsSync(pdfiumSource)) {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  copyFileSync(pdfiumSource, pdfiumTarget);
  console.log('Copied pdfium.wasm to public/.');
} else {
  console.warn('pdfium.wasm not found in node_modules; skipping copy.');
}
