import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pdf from 'pdf-parse';
import {
  ATTRIBUTION_TEXT,
  LICENSE,
  SRD_PDF_URL,
  SRD_SOURCE,
  SRD_SOURCE_PAGE_URL,
  SRD_SYSTEM,
} from './constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDir = path.join(__dirname, '.cache');
const pdfPath = path.join(cacheDir, 'SRD_CC_v5.1.pdf');
const outPath = path.join(cacheDir, 'chunks.srd5.1.jsonl');

const maxCharsArg = getArg('--max-chars');
const overlapArg = getArg('--overlap');
const maxChars = maxCharsArg ? Number(maxCharsArg) : 1200;
const overlap = overlapArg ? Number(overlapArg) : 200;

if (!Number.isFinite(maxChars) || maxChars < 200) {
  throw new Error('--max-chars must be a number >= 200');
}
if (!Number.isFinite(overlap) || overlap < 0 || overlap >= maxChars) {
  throw new Error('--overlap must be a number >= 0 and < --max-chars');
}

const buf = await fs.readFile(pdfPath);
const parsed = await pdf(buf);
// pdf-parse returns a best-effort plain text; we keep chunking robust rather than perfect.
const rawText = (parsed.text ?? '').replace(/\r\n/g, '\n');
if (!rawText.trim()) {
  throw new Error(`No text extracted from PDF: ${pdfPath}`);
}

const normalized = normalizePdfText(rawText);
const chunks = chunkText(normalized, { maxChars, overlap });

const createdAt = new Date().toISOString();
let i = 0;
const lines = chunks.map((content) => {
  const contentSha256 = sha256Hex(content);
  const section = extractSection(content);
  const metadata = {
    title: 'System Reference Document 5.1',
    section,
    url: SRD_PDF_URL,
    source_page: SRD_SOURCE_PAGE_URL,
    license: LICENSE,
    attribution: ATTRIBUTION_TEXT,
    ingest: {
      pipeline: 'scripts/ingest-srd',
      version: 1,
      created_at: createdAt,
      content_sha256: contentSha256,
    },
    chunk: {
      index: i,
      max_chars: maxChars,
      overlap,
    },
  };

  const row = {
    system: SRD_SYSTEM,
    source: SRD_SOURCE,
    content,
    metadata,
  };

  i += 1;
  return JSON.stringify(row);
});

await fs.mkdir(cacheDir, { recursive: true });
await fs.writeFile(outPath, `${lines.join('\n')}\n`, 'utf8');

process.stdout.write(`Extracted text chars: ${normalized.length}\n`);
process.stdout.write(`Chunks written: ${chunks.length}\n`);
process.stdout.write(`Output: ${outPath}\n`);

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function normalizePdfText(text) {
  // Remove common headers/footers and normalize whitespace.
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !isNoiseLine(l));

  // Reintroduce paragraph breaks: pdf extraction tends to over-newline.
  // We treat short lines as part of a paragraph unless they look like headings.
  const paras = [];
  let cur = '';
  for (const line of lines) {
    if (looksLikeHeading(line)) {
      if (cur) paras.push(cur.trim());
      paras.push(line.trim());
      cur = '';
      continue;
    }
    if (!cur) {
      cur = line;
      continue;
    }
    // If previous line ends sentence, keep space; otherwise also keep space.
    cur += ` ${line}`;
    // Hard paragraph boundary heuristic: very long accumulated paragraphs become paragraphs.
    if (cur.length >= 1800) {
      paras.push(cur.trim());
      cur = '';
    }
  }
  if (cur) paras.push(cur.trim());
  return paras.join('\n\n');
}

function isNoiseLine(line) {
  if (/^\d+$/.test(line)) return true; // page numbers
  if (/^System Reference Document( 5\.1)?$/i.test(line)) return true;
  if (/^System Reference Document 5\.1 \d+$/i.test(line)) return true;
  if (/^SRD( CC)? v?5\.1/i.test(line)) return true;
  return false;
}

function looksLikeHeading(line) {
  if (line.length < 3 || line.length > 60) return false;
  if (/[\.!?]$/.test(line)) return false;
  if (/\d/.test(line)) return false;
  if (/[,:;]/.test(line)) return false;
  if (/[()]/.test(line)) return false;
  if (/^[+\-*/]/.test(line)) return false;
  const words = line.split(' ').filter(Boolean);
  if (words.length > 8) return false;
  // Many headings are Title Case words; exclude lines that are mostly numeric.
  if (words.every((w) => /^\d+$/.test(w))) return false;
  if (words.some((w) => w.length > 28)) return false;
  return true;
}

function extractSection(content) {
  // Best-effort: chunks may include multiple headings; prefer the most specific
  // heading by taking the *last* heading-like line seen near the top.
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let last = null;
  for (const l of lines.slice(0, 40)) {
    if (looksLikeHeading(l)) last = l;
  }
  return last;
}

function chunkText(text, { maxChars, overlap }) {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';

  for (const p of paras) {
    const next = cur ? `${cur}\n\n${p}` : p;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }

    if (cur) chunks.push(cur.trim());

    // If a single paragraph is too big, split it.
    if (p.length > maxChars) {
      for (const part of splitWithOverlap(p, maxChars, overlap)) {
        chunks.push(part);
      }
      cur = '';
    } else {
      cur = p;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

function splitWithOverlap(text, maxChars, overlap) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    let slice = text.slice(start, end);
    // Try not to cut mid-word.
    if (end < text.length) {
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > 0 && lastSpace > maxChars * 0.6) {
        slice = slice.slice(0, lastSpace);
      }
    }
    slice = slice.trim();
    if (slice) out.push(slice);
    if (end >= text.length) break;
    start += Math.max(1, slice.length - overlap);
  }
  return out;
}
