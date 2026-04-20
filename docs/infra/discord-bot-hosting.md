# Discord bot hosting decision (Phase 0 placeholder)

## Decision: Railway (for the initial bot)

Rationale (Phase 0/early Phase 1):

- Lowest operational overhead: push-to-deploy from GitHub, easy logs, easy secrets
- Good fit for an always-on Node process (Discord gateway websocket + workers)
- Simple promotion path later (separate `dev`/`prod` services)

If/when we need tighter control over regions/cost/performance, we can reassess Fly.io.

## Placeholder deploy plan (no service code yet)

When the bot is introduced (future phase):

1. Add a standalone `apps/discord-bot/` (or `services/discord-bot/`) with its own `package.json` and Dockerfile.
2. Railway:
   - Create `dmcopilot-bot-dev` + `dmcopilot-bot-prod`
   - Set environment variables (Discord token, Supabase service key, Upstash token, etc.)
   - Deploy from GitHub, pin to a Node LTS runtime
3. Add a dedicated CI workflow for the bot so web CI stays fast.
