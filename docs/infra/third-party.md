# Third-party setup (Phase 0 WP5)

Keep every key in server-side env vars only. Do not add these to `NEXT_PUBLIC_*` variables.

## Where to set env vars

- **Local dev:** `.env.local`
- **Vercel Preview:** Preview environment variables in the Vercel project settings
- **Vercel Production:** Production environment variables in the Vercel project settings
- **Discord bot hosting:** Railway or Fly.io environment variables for the bot service

## Anthropic

1. Create an Anthropic account.
2. Add billing before generating production keys.
3. In the console, confirm:
   - organization spend limit
   - request/rate limits
   - model access you expect to use
4. Create a server-side API key and store it as `ANTHROPIC_API_KEY`.

## Voyage AI

1. Create a Voyage AI account.
2. Generate an API key.
3. Store it as `VOYAGE_API_KEY`.

## Deepgram

1. Create a Deepgram account.
2. Create a project.
3. Generate an API key for that project.
4. Store it as `DEEPGRAM_API_KEY`.

## ElevenLabs

1. Create an ElevenLabs account.
2. Generate an API key.
3. Store it as `ELEVENLABS_API_KEY`.
4. Voice policy reminder: use library voices only. Do not plan on user-uploaded voice cloning unless that is explicitly approved later.

## Flux image generation provider

We are deferring the final provider choice for now.

- **Replicate:** create an account, then generate an API token and store it as `REPLICATE_API_TOKEN`.
- **fal.ai (alternate):** if we switch later, create a key and store it as `FAL_KEY`.

Use the provider-specific key only after the provider decision is final.

## Discord

1. In the Discord Developer Portal, create a new application.
2. Add a bot user to the application.
3. Reset/copy the bot token and store it as `DISCORD_BOT_TOKEN`.
4. Copy the application/client ID and store it as `DISCORD_CLIENT_ID`.
5. Keep privileged gateway intents off unless a later feature requires them.
6. Use only the minimal scopes for now: `bot` and `applications.commands`.

## Env var names

- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`
- `REPLICATE_API_TOKEN`
- `FAL_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
