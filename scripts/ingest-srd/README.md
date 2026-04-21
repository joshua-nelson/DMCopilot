## SRD 5.1 ingestion (Phase 1 / Stage 2B)

### Source & license

- Source (machine-readable PDF): https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf
- Source page (documents SRD 5.1 under CC-BY-4.0): https://www.dndbeyond.com/srd
- License: Creative Commons Attribution 4.0 International (CC-BY-4.0)
  - https://creativecommons.org/licenses/by/4.0/

### What this does

Downloads SRD 5.1 (CC) at runtime (cached under `scripts/ingest-srd/.cache/`), extracts text, chunks it, and loads it into `public.rules_chunks`.

- Default behavior is **no embeddings** (stores `embedding = null`) to keep dev/testing free.
- Every row includes **attribution + CC-BY license info** in `metadata`.
- Ingest is **idempotent** by default: deletes and reinserts all global (`campaign_id is null`) SRD 5.1 rows.

### Requirements

- Node.js (same version you use for the repo)
- Env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (required to insert)

### Run locally

```bash
# 1) Download (cached)
node scripts/ingest-srd/download.mjs

# 2) Parse into JSONL chunks (cached)
node scripts/ingest-srd/parse.mjs

# 3) Seed into Postgres via Supabase
node scripts/ingest-srd/seed.mjs
```

Optional flags:

- Force re-download:

```bash
node scripts/ingest-srd/download.mjs --force
```

- Seed without deleting first:

```bash
node scripts/ingest-srd/seed.mjs --no-replace
```
