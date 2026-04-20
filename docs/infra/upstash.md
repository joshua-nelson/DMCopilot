# Upstash provisioning (Redis)

## Create databases

Create two Redis databases:

- `dmcopilot-dev`
- `dmcopilot-prod`

Choose a region close to your Vercel region.

## Get REST credentials

For each database, copy the REST credentials:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

These are **server-only**. Do not expose them via `NEXT_PUBLIC_*` env vars.
