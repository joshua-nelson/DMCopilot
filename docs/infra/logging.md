# Logging & log aggregation (Phase 0 decision)

## Decision

**Use Vercel Logs for Phase 0.**

## Rationale

- Lowest setup cost: works out of the box for Next.js on Vercel.
- Good enough for Phase 0 debugging (deploy-time, runtime, server actions).
- Avoids introducing a third-party log pipeline before we have defined retention/search needs.

## How to access logs

1. Vercel project → **Deployments** → pick a deployment
2. Open **Logs**

## When to revisit

If we need structured query, longer retention, alerting on log patterns, or cross-service correlation, revisit:

- **Axiom** (strong query + integrations)
- **Logtail / Better Stack** (quick setup, good search/alerts)
