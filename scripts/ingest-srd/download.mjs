import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SRD_PDF_URL } from './constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDir = path.join(__dirname, '.cache');
const outPath = path.join(cacheDir, 'SRD_CC_v5.1.pdf');

const force = process.argv.includes('--force');

await fs.mkdir(cacheDir, { recursive: true });

if (!force) {
  try {
    await fs.stat(outPath);
    process.stdout.write(`Cache hit: ${outPath}\n`);
    process.exit(0);
  } catch {
    // continue
  }
}

process.stdout.write(`Downloading SRD 5.1 (CC) from: ${SRD_PDF_URL}\n`);
const res = await fetch(SRD_PDF_URL);
if (!res.ok) {
  throw new Error(`Download failed: ${res.status} ${res.statusText}`);
}

const arr = new Uint8Array(await res.arrayBuffer());
await fs.writeFile(outPath, arr);
process.stdout.write(`Saved: ${outPath} (${arr.byteLength} bytes)\n`);
