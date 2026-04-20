# Deploy plan (Phase 0 placeholder)

## Environments

- **Local**: `.env.local` (developer machine)
- **Preview**: Vercel Preview (PRs) + Supabase dev + Upstash dev
- **Production**: Vercel Production (`main`) + Supabase prod + Upstash prod

## Promotion flow

1. Open PR
2. CI runs (lint/typecheck/unit/build)
3. Vercel creates Preview deploy (uses dev backing services)
4. Merge to `main`
5. Vercel deploys Production (uses prod backing services)

## Rollback (web)

- Use Vercel “Deployments” to redeploy a previous production build.

## Future: Discord bot

- Hosted separately (Railway) with its own dev/prod environments.
