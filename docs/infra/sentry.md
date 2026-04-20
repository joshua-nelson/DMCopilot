# Sentry (errors)

Phase 0 uses the Sentry Next.js SDK for error reporting.

## Environment variables

- `SENTRY_DSN` (server/edge)
- `NEXT_PUBLIC_SENTRY_DSN` (client)

If either DSN is empty, Sentry is disabled.

## Safe-by-default

We set `sendDefaultPii: false` and do not attach user identity by default.

## Source maps (optional, recommended)

Readable stack traces in Sentry require source map upload during `next build`.

This repo only enables Sentry's build-time upload when all three are present:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### Setup

1. Create a Sentry project for **Next.js**.
2. Add DSNs to `.env.local` / Vercel env vars.
3. (Optional) Configure source map upload secrets in your CI/CD environment.

Notes:

- Do **not** put `SENTRY_AUTH_TOKEN` in `NEXT_PUBLIC_*` vars.
- If CI does not have these secrets, builds remain hermetic and source maps will not upload.
