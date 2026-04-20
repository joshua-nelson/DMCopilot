# Vercel provisioning (web app)

## Create the project

1. Vercel → **Add New… → Project**
2. Import the GitHub repo
3. Framework preset: **Next.js**
4. Build settings:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: (default)
5. Ensure preview deployments are enabled (default for GitHub-connected projects).

## Environments

Vercel supports separate env var sets for:

- **Development** (local `vercel dev` only; optional)
- **Preview** (all PR deploys)
- **Production** (the `main` branch deploy)

Recommended separation for Phase 0:

- Preview uses **dev** Supabase/Upstash
- Production uses **prod** Supabase/Upstash

## Environment variables to add

Add these in **Project → Settings → Environment Variables**.

Public:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SENTRY_DSN` (optional)
- `NEXT_PUBLIC_POSTHOG_KEY` (optional)

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN` (optional)

## Preview deploy behavior

- PRs should produce a Preview URL automatically.
- After branch protection is enabled, require **CI / CI** to pass before merging.
