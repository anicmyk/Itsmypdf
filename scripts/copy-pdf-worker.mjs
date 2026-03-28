import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const targetDir = resolve('public');
const target = resolve('public', 'pdf.worker.min.js');

if (existsSync(source)) {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  copyFileSync(source, target);
  console.log('Copied pdf.worker.min.js to public/.');
} else {
  console.warn('pdf.worker.min.js not found in node_modules; skipping copy.');
}
