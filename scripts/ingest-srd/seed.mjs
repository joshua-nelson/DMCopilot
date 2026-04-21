import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { SRD_SOURCE, SRD_SYSTEM } from './constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDir = path.join(__dirname, '.cache');
const inPath = path.join(cacheDir, 'chunks.srd5.1.jsonl');

const replace = !process.argv.includes('--no-replace');
const batchSizeArg = getArg('--batch-size');
const batchSize = batchSizeArg ? Number(batchSizeArg) : 200;
if (!Number.isFinite(batchSize) || batchSize < 1) {
  throw new Error('--batch-size must be a positive number');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const voyageApiKey = process.env.VOYAGE_API_KEY;
let warnedMissingVoyageKey = false;

if (replace) {
  process.stdout.write(
    `Replacing existing rows where campaign_id is null, system='${SRD_SYSTEM}', source='${SRD_SOURCE}'...\n`
  );
  const { error } = await supabase
    .from('rules_chunks')
    .delete()
    .is('campaign_id', null)
    .eq('system', SRD_SYSTEM)
    .eq('source', SRD_SOURCE);
  if (error) throw error;
}

const rows = [];
let total = 0;
let inserted = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(inPath, 'utf8'),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);
  rows.push({
    campaign_id: null,
    system: obj.system,
    source: obj.source,
    content: obj.content,
    embedding: null,
    metadata: obj.metadata ?? {},
  });
  total += 1;

  if (rows.length >= batchSize) {
    inserted += await insertBatch(rows);
    rows.length = 0;
  }
}
if (rows.length) inserted += await insertBatch(rows);

process.stdout.write(`Total parsed rows: ${total}\n`);
process.stdout.write(`Inserted rows: ${inserted}\n`);

async function insertBatch(batch) {
  await addEmbeddings(batch);
  const { error } = await supabase.from('rules_chunks').insert(batch);
  if (error) throw error;
  process.stdout.write(`Inserted batch: ${batch.length}\n`);
  return batch.length;
}

async function addEmbeddings(batch) {
  if (!voyageApiKey) {
    if (!warnedMissingVoyageKey) {
      warnedMissingVoyageKey = true;
      console.warn(
        '[voyage] VOYAGE_API_KEY is not set; inserting rules_chunks with embedding=null'
      );
    }
    for (const row of batch) row.embedding = null;
    return;
  }

  const model = 'voyage-3-lite';
  const groupSize = 32;

  for (let i = 0; i < batch.length; i += groupSize) {
    const group = batch.slice(i, i + groupSize);
    const texts = group.map((r) => r.content);

    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Voyage embeddings request failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`
      );
    }

    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) {
      throw new Error('Voyage embeddings response malformed: missing data[]');
    }

    if (data.length !== texts.length) {
      throw new Error(
        `Voyage embeddings response malformed: expected ${texts.length} embeddings, got ${data.length}`
      );
    }

    for (let j = 0; j < group.length; j += 1) {
      const emb = data[j]?.embedding;
      if (!Array.isArray(emb) || emb.some((n) => typeof n !== 'number')) {
        throw new Error(
          'Voyage embeddings response malformed: embedding is not number[]'
        );
      }
      group[j].embedding = emb;
    }
  }
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}
