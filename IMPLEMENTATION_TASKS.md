# DM Copilot — Implementation Task List

> **Companion to:** DM Copilot Design Document v0.2
> **Format:** Phased, checkbox-driven. Each task carries a rough size estimate.
> **Sizing:** `S` = under half a day · `M` = half day to 2 days · `L` = 2–5 days · `XL` = a week or more
> **Symbols:** `🔑` critical path · `⚠️` risky/uncertain · `→` depends on another task · `💰` directly affects per-session cost

---

## Phase 0 — Project Setup & Infrastructure

Goal: a deployable skeleton with auth, a database, and observability. Zero features — but everything downstream assumes this is solid.

### Repository & Tooling

- [x] Initialize Next.js 15 app (App Router, TypeScript, Tailwind) `[S]`
- [x] Install and configure shadcn/ui with a custom tavern/parchment theme `[S]`
- [x] Set up ESLint, Prettier, TypeScript strict mode, Husky pre-commit hooks `[S]`
- [x] Configure Vitest for unit tests, Playwright for E2E `[S]`
- [x] Create GitHub repo, branch protection rules, PR template `[S]`
- [x] Set up GitHub Actions for CI (lint, typecheck, test, build) `[M]`

### Hosting & Environments

- [x] Create Vercel project, connect to GitHub, configure preview deploys `[S]`
- [x] Provision Supabase project (dev + prod) `[S]`
- [x] Provision Upstash Redis (dev + prod) `[S]`
- [x] Document env var schema in `.env.example` + Vercel env vars `[S]`
- [ ] Decide on Railway vs Fly.io for the Discord bot; create placeholder deploy `[M]`

### Third-Party Accounts & API Keys

- [ ] Anthropic API account, billing, organization-level rate limits confirmed `[S]` 🔑
- [ ] Voyage AI account + API key `[S]`
- [ ] Deepgram account + API key `[S]`
- [ ] ElevenLabs account + voice library review `[S]`
- [ ] Replicate or fal.ai account for Flux image generation `[S]`
- [ ] Discord developer application, bot token `[S]`

### Auth

- [x] Choose Clerk vs Supabase Auth (recommend Clerk for speed) `[S]` 🔑
- [x] Implement sign-up, sign-in, password reset `[M]`
- [x] Protected route wrapper / middleware `[S]`
- [x] User profile table + onboarding flow `[M]`

### Observability

- [x] Sentry set up in app + source maps in CI `[S]`
- [x] PostHog set up for product analytics, with key events defined `[M]`
- [ ] Log aggregation decision (Axiom, Logtail, or Vercel logs) `[S]`
- [x] Custom "AI cost" tracking table + instrumentation helper `[M]` 💰 🔑
- [x] Dashboard: cost per session, cache hit rate, Gate 1 elimination rate `[L]` 💰

### Base Layout

- [x] App shell with persistent header, sidebar, main panel `[M]`
- [x] Empty-state dashboard with "create your first campaign" CTA `[S]`
- [x] Theme toggle (dark/light) `[S]`

---

## Phase 1 — Foundations (MVP: DM-only, text-based, no voice)

Goal: a working DM tool for a single campaign. Character sheets, combat tracker, notes, rules lookup. No transcription, no NPC agents, no proactive features yet. Cost architecture is in place from day one.

### Database Schema (Supabase Postgres)

- [x] Enable `pgvector` and `pg_trgm` extensions `[S]` 🔑
- [x] Migration: `users`, `campaigns`, `sessions`, `characters`, `encounters`, `notes` `[M]` 🔑
- [x] Migration: `events`, `transcript_segments` (empty table, used in Phase 2) `[S]`
- [x] Migration: `memory_chunks`, `rules_chunks` with vector + tsvector cols `[M]`
- [x] Migration: `proper_nouns` (campaign-scoped dictionary for Gate 1) `[S]`
- [x] Migration: `relationships`, `handouts`, `npc_agents` (Phase 3/4/5 stubs) `[S]`
- [x] Row-Level Security policies: users only access their own campaigns `[M]` 🔑 ⚠️
- [x] Seed script with a demo campaign + characters for dev `[S]`

### Campaign Management

- [x] Campaign CRUD API (server actions) `[M]`
- [ ] Create campaign form: name, setting summary, tone, system (D&D 5e default) `[S]`
- [ ] Campaign dashboard page: recent sessions, player roster, quick stats `[M]`
- [x] Campaign settings page (editable fields, delete confirmation) `[S]`
- [x] Campaign switcher in header `[S]`

### Character Sheets

- [x] Design 5e-compatible character sheet JSON schema (ability scores, HP, AC, saves, skills, features, spell slots, inventory) `[L]` 🔑
- [ ] Character create form with class/race basics `[L]`
- [ ] Character sheet view (read mode) `[M]`
- [ ] Character sheet edit mode with field-level saves `[L]`
- [x] Inventory management (add/remove/quantity) `[M]`
- [x] Spell slot tracking `[M]`
- [ ] Character portrait upload → R2 `[M]`
- [ ] Roster display: card grid per campaign `[S]`

### Combat Tracker

- [x] Encounter data model: participants, round, active turn index `[S]`
- [x] Start combat flow: roll initiative (auto or manual), order participants `[M]` 🔑
- [ ] Initiative list UI with current-turn highlight `[M]`
- [ ] dnd-kit drag-to-reorder initiative `[M]`
- [ ] HP adjust: click-to-edit with +/- buttons, keyboard shortcuts `[M]` 🔑
- [ ] AC display + temp AC (Shield spell etc.) `[S]`
- [x] Condition tracker: toggle conditions per participant with duration `[M]`
- [x] Concentration tracking: which spell, damage triggers save prompt `[M]`
- [ ] Monster stat blocks: embed SRD creatures, support custom creatures `[L]`
- [x] Hidden HP for monsters (DM-only) `[S]`
- [x] "Next turn" button advances initiative, decrements duration timers `[M]`
- [x] End combat flow with summary `[S]`

### Persistent Status Strip (UI)

- [x] One-row player status component: HP bar, AC, condition icons `[M]` 🔑
- [ ] Click to expand full sheet inline `[S]`
- [ ] Visible on all DM screens regardless of phase `[S]`

### Notes

- [x] Session notes editor: markdown with autosave `[M]`
- [ ] Pin/flag important notes (used later by memory system) `[S]`
- [ ] Note search within session `[S]`

### SRD 5.1 Ingestion

- [x] Download SRD 5.1 CC-BY corpus (verify source) `[S]` ⚠️
- [x] Parse into logical chunks (spells, rules sections, conditions, creatures, items) `[L]`
- [x] Embed with voyage-3-large, store in `rules_chunks` `[M]` 💰
- [x] Build full-text search index (tsvector + GIN) `[S]`
- [x] One-time ingest script, re-runnable idempotently `[M]`
- [x] Include source attribution in every chunk (CC-BY compliance) `[S]` ⚠️

### Rules Lookup Feature

- [x] Command-bar UI (keyboard shortcut `⌘K`) `[M]`
- [x] Hybrid search endpoint: pgvector + tsvector + RRF merge `[L]` 🔑 💰
- [x] Haiku prompt for rules Q&A, reads top 3 retrieved chunks `[M]` 💰
- [x] Result display with citations linking to SRD chunk `[M]`
- [x] Recent queries list `[S]`

### Session Lifecycle

- [x] Start session: creates `sessions` row, sets phase to "prep" `[S]`
- [x] Active session view `[M]`
- [x] Phase switcher (exploration / roleplay / combat / prep) `[M]`
- [x] End session: finalizes row, triggers post-session summary job `[S]`

### Fluid Panel Layout

- [x] Panel primitive: expandable, collapsible, drag-to-reorder `[L]` 🔑
- [x] Layout presets per phase (exploration/roleplay/combat/prep) `[M]`
- [x] Auto-apply preset on phase change, DM can override `[M]`
- [x] Save custom layouts per user `[M]`

### Post-Session Summary

- [x] Sonnet 4.6 prompt: consumes session notes + combat log → structured summary JSON `[L]` 💰
- [ ] Submit via Anthropic Batch API (50% discount) `[M]` 💰 🔑
- [ ] Poll for batch result, store in `sessions.summary_json` `[M]`
- [x] Summary display UI (events, NPCs met, loot, decisions, threads) `[M]`
- [x] Edit-in-place for DM corrections `[M]`

### Prompt Caching Foundation

- [x] Utility to build layered prompts (static / campaign / session / volatile) `[L]` 🔑 💰
- [x] `cache_control` breakpoint injection at each boundary `[M]` 💰
- [x] Cache hit rate metric logged to analytics `[S]` 💰
- [x] Unit tests for prompt layering `[M]`

---

## Phase 2 — The Scribe

Goal: real-time transcription during sessions via Discord. Gating architecture live so downstream phases are cost-safe. No memory retrieval yet — just capture and extract.

### Discord Bot Project

- [ ] Bootstrap discord.js bot project in monorepo `[M]`
- [ ] Bot can connect to a Discord guild + register slash commands `[M]`
- [ ] `/join` and `/leave` commands for voice channel `[M]` 🔑
- [ ] Per-user audio stream capture (Discord separates automatically) `[L]` 🔑 ⚠️
- [ ] Health check endpoint + graceful reconnect on drop `[M]`
- [ ] Deploy bot to Railway/Fly.io with persistent instance `[M]`

### Deepgram Streaming STT

- [ ] Deepgram WebSocket client in the bot process `[M]` 🔑
- [ ] Pipe per-user Discord audio → Deepgram streams `[L]` 🔑 ⚠️
- [ ] Map Discord user ID → `characters.id` (speaker attribution) `[M]`
- [ ] Push transcript segments to Supabase via API `[M]`
- [ ] Handle interruptions: partial vs final transcripts `[M]`
- [ ] Latency measurement: speech → transcript in app `[S]`

### Transcript Ingestion Endpoint

- [ ] `POST /api/transcript` with speaker + text + timestamp `[M]`
- [ ] Insert into `transcript_segments` `[S]`
- [ ] Publish Supabase Realtime event `[S]`

### Live Transcript Panel

- [ ] Realtime-subscribed transcript feed component `[M]` 🔑
- [ ] Speaker color coding, timestamps, auto-scroll `[M]`
- [ ] DM correction overlay (edit any segment) `[M]`
- [ ] One-click flag: event / foreshadow / secret / decision `[M]`
- [ ] Visual indicator when segment is being processed by AI `[S]`

### Gate 1 — Pattern Matching (free, zero tokens)

- [ ] Proper-noun dictionary builder: pulls from `characters`, `handouts`, flagged events `[M]` 🔑 💰
- [ ] Keyword catalogs: rules triggers, question patterns, combat verbs `[M]` 💰
- [ ] In-process matcher runs per segment on ingest, writes `gate_flags_json` `[M]` 💰
- [ ] Filter rate metric (target 70–80%) surfaced in dashboard `[S]` 💰
- [ ] Unit tests covering edge cases (possessives, pluralization, ambiguous names) `[M]`

### Gate 2 — Classifier

- [ ] Design cached classifier prompt with tool-use structured output `[M]` 🔑 💰
- [ ] Haiku call wrapper with retries + timeout `[M]` 💰
- [ ] Batch small segments together when possible to amortize overhead `[M]` 💰
- [ ] Log per-call cost + latency `[S]` 💰
- [ ] Downstream worker dispatcher reads flags → fires relevant workers `[M]`

### Event Extraction (batched)

- [ ] Buffer transcript segments over a rolling ~30s window `[M]` 💰
- [ ] Haiku prompt: extract NPCs met, loot gained, decisions, plot threads `[L]` 🔑 💰
- [ ] Structured tool-use output → `events` table `[M]`
- [ ] Dedupe against existing events (same NPC met again ≠ new event) `[M]`
- [ ] Events visible in a session-timeline UI `[M]`

### Transcript Search

- [ ] Full-text search over `transcript_segments` `[M]`
- [ ] Filter by speaker, session, flag type, date range `[M]`
- [ ] Search results view with surrounding context `[M]`

### Fallback: Browser Mic

- [ ] In-person / no-Discord mode: MediaRecorder in browser → stream to Deepgram directly `[L]`
- [ ] UI toggle between Discord and browser mic sources `[S]`

---

## Phase 3 — Memory & Suggestions

Goal: the Copilot remembers the campaign. Semantic retrieval, hybrid search, proactive hints with budget controls, Inngest orchestration.

### Voyage Embedding Pipeline

- [ ] Voyage API client with retry + rate-limit handling `[M]` 🔑 💰
- [ ] Embedding service: `embed(texts, model)` → vectors `[M]` 💰
- [ ] Chunking strategy for transcripts (by scene, ~500 tokens) `[M]` 💰
- [ ] Inngest job: embed on insert for transcripts, summaries, events, NPCs `[M]` 🔑
- [ ] Embedding model version stored per chunk (allows migration) `[S]`
- [ ] Backfill job for existing data from Phase 1/2 `[M]`

### Hybrid Search

- [ ] pgvector cosine similarity search function `[M]` 🔑 💰
- [ ] tsvector full-text search with ranking `[M]`
- [ ] Reciprocal Rank Fusion merge implementation `[M]` 💰
- [ ] Voyage rerank integration (optional second pass) `[M]` 💰
- [ ] Unified `memorySearch(query, filters, topK)` API `[M]`
- [ ] Tests against fixture campaign for retrieval quality `[L]` ⚠️

### Retrieval Cache (Redis)

- [ ] Scene-scoped cache keys (`retrieval:session:{id}:scene:{n}:{query_hash}`) `[M]` 💰
- [ ] TTL-based expiry (default 3 min, refreshed on hit) `[S]` 💰
- [ ] Invalidation on scene change / new events `[M]`
- [ ] Cache hit rate metric `[S]` 💰

### Proactivity Slider & Budget

- [ ] Slider UI in header (0–3, with tooltip explaining each level) `[S]` 🔑
- [ ] Per-level behavior config (scan interval, max concurrent, features on/off) `[M]`
- [ ] Session token budget tracker (Redis counter, reactive vs proactive split) `[M]` 🔑 💰
- [ ] Graceful downgrade at 80% of budget with DM notification `[M]` 💰
- [ ] DM override: "extend budget" or "disable proactive for session" `[S]`
- [ ] Budget gauge in persistent UI `[S]`

### Callback Surfacing

- [ ] Scene change detection (DM flag or transcript cue) `[M]`
- [ ] Callback query: recent NPC/location → retrieve past appearances `[M]` 💰
- [ ] Haiku summarization into hint card `[M]` 💰
- [ ] Hint card UI: dismissible, shareable to notes, expandable `[M]`

### Contradiction Detection (narrow triggers only)

- [ ] Trigger rules: speaker=DM + entity-in-DB + factual-claim pattern `[M]` 🔑 💰
- [ ] Retrieve existing canon for that entity `[M]` 💰
- [ ] Sonnet comparison prompt (cached system + small input) `[M]` 💰
- [ ] Contradiction card UI with "acknowledge / update canon / dismiss" actions `[M]`
- [ ] Log false-positive rate for tuning `[S]` ⚠️

### Relationship & Faction Tracker

- [ ] Relationships graph data model `[M]`
- [ ] Auto-update rules from extracted events (party helped faction → +value) `[L]` ⚠️
- [ ] DM manual override UI `[M]`
- [ ] Visualization (simple graph or sortable table) `[M]`

### Inngest Orchestration

- [ ] Install Inngest, local dev server, Vercel plugin `[M]` 🔑
- [ ] Define event schemas (`transcript.segment.created`, `npc.dialogue.requested`, etc.) `[M]`
- [ ] Transcript-segment fan-out workflow (embed, Gate 1, Gate 2, combat, proactive) `[L]` 🔑
- [ ] Retry policies, idempotency keys, dead-letter handling `[M]` ⚠️
- [ ] Concurrency limits per session (Haiku 5, Sonnet 2, Opus 1) `[M]` 💰
- [ ] Observability: which workers fire per segment, latencies `[M]`

---

## Phase 4 — NPC Agents

Goal: the DM can hand the mic to a minor NPC, see a proposed line with optional voice, approve or edit, and deliver to the table.

### NPC Profile Editor

- [ ] Extend `characters` with `type=npc`, link to `npc_agents` row `[S]`
- [ ] NPC editor form: name, appearance, personality, goals, secrets, speech style `[L]` 🔑
- [ ] Knowledge scope editor: tag events/locations/people the NPC knows about `[L]` ⚠️
- [ ] Voice picker: ElevenLabs voice library browser + preview `[M]`
- [ ] NPC portrait: upload or generate via Flux `[M]`
- [ ] NPC list per campaign with search `[M]`

### DM Approval Chat UI

- [ ] "Hand the mic" entry point: select NPC from list or @-mention `[M]` 🔑
- [ ] Side panel chat: DM directive ("be evasive about the ring") + player context `[L]`
- [ ] Proposed dialogue preview with edit, regenerate, approve, reject `[M]` 🔑
- [ ] Approved line pushed to Discord text channel + spoken via bot `[M]`
- [ ] History of past lines per NPC per session `[M]`

### Whisper Channel

- [ ] Hidden-from-players DM directives appended to agent prompt `[M]`
- [ ] UI distinction between public context and whispered steering `[S]`
- [ ] Whisper log visible to DM only `[S]`

### ElevenLabs TTS Integration

- [ ] ElevenLabs streaming TTS client `[M]` 🔑
- [ ] Audio streaming to Discord voice channel via bot `[L]` 🔑 ⚠️
- [ ] Local playback fallback for in-person sessions (browser audio) `[M]`
- [ ] Phrase cache for repeated lines ("Greetings, traveler") `[M]` 💰
- [ ] Per-NPC voice settings (stability, similarity boost) `[S]`

### Agent Orchestration

- [ ] Inngest workflow: parallel retrieval (prior appearances, lore, sheet) `[M]` 🔑
- [ ] Sonnet streaming generation with scoped-knowledge system prompt `[L]` 🔑 💰
- [ ] TTS streams concurrently with text generation `[L]` ⚠️
- [ ] Scope enforcement: agent cannot reveal info outside `knowledge_scope` `[L]` 🔑 ⚠️
- [ ] Test harness: given a prompt + scope, verify no leakage `[L]` ⚠️

### NPC Quick Launcher

- [ ] Keyboard shortcut to summon NPC by name `[S]`
- [ ] Recent NPCs sidebar `[S]`

---

## Phase 5 — Prep & Polish

Goal: the DM's pre-session workflow. Image gen, player-facing view, recaps. This is where the product starts to feel complete.

### Prep Assistant

- [ ] Prep mode UI (distinct from active session) `[M]`
- [ ] NPC generator: name / appearance / motivation with campaign context `[M]` 💰
- [ ] Encounter generator: party level + biome → creatures + tactics `[L]` 💰
- [ ] Rumor/hook generator consistent with known factions `[M]` 💰
- [ ] Location generator with boxed-text read-aloud `[M]` 💰
- [ ] Loot generator balanced to party level `[M]`
- [ ] Save generated content to campaign (not auto-applied to canon) `[M]`
- [ ] Use Batch API for async prep tasks `[M]` 💰

### Foreshadowing Tracker

- [ ] Tag seeds: "the innkeeper was nervous" → foreshadow record `[M]`
- [ ] Decay scan: nightly batch job checks age of untouched threads `[M]` 💰
- [ ] Reminder UI before next session `[M]`
- [ ] Mark threads resolved / dropped `[S]`

### Handouts System

- [ ] Handout upload (images, text, maps) during prep `[M]`
- [ ] Handout library per campaign `[S]`
- [ ] Reveal flow: push to Discord channel or player view `[M]`
- [ ] Reveal log (what players have seen when) `[S]`

### On-the-Fly Image Generation

- [ ] Flux/SDXL client via Replicate or fal.ai `[M]`
- [ ] Scene description → image prompt translation (Haiku) `[M]` 💰
- [ ] Async generation with loading state `[M]`
- [ ] Store in R2, display inline `[S]`
- [ ] Regenerate / vary options `[S]`

### Player-Facing View

- [ ] Separate `/player/[session]` route with scoped auth `[L]` 🔑 ⚠️
- [ ] Character sheet read-only for the player `[M]`
- [ ] Current initiative order (public info only) `[S]`
- [ ] Handouts feed as they're revealed `[M]`
- [ ] Party HP bars (no monster info) `[S]`
- [ ] Mobile-responsive layout `[M]`
- [ ] Player invitation flow (magic links) `[M]`

### Session Recap Generator

- [ ] Bullet mode: structured list from summary JSON `[M]`
- [ ] Narrative mode: Opus 4.7 via Batch, written in campaign tone `[L]` 💰
- [ ] Export: copy to clipboard, email, Discord post `[M]`
- [ ] Include key images/handouts in recap `[M]`

### Polish

- [ ] Onboarding tutorial for new DMs `[L]`
- [ ] Example campaign / demo mode `[M]`
- [ ] Keyboard shortcut reference page `[S]`
- [ ] Empty states with helpful CTAs throughout `[M]`
- [ ] Loading skeletons, not spinners, on all async surfaces `[M]`

---

## Phase 6 — Scale & Monetization

### Multi-Campaign Management

- [ ] Campaign dashboard with cards, filters, last-played sort `[M]`
- [ ] Archive / delete campaign with data export `[M]`
- [ ] Campaign duplication (for one-shots, playtests) `[M]`

### Usage Metering & Billing

- [ ] Per-user AI cost rollup (already instrumented in Phase 0) `[M]` 💰
- [ ] Subscription tiers: free / hobbyist / serious DM `[L]`
- [ ] Stripe integration with checkout + customer portal `[L]` ⚠️
- [ ] Entitlement checks on AI calls (fail gracefully with upgrade prompt) `[M]`
- [ ] Admin dashboard: revenue, cost-per-user margin, churn `[L]`

### Import Tools

- [ ] D&D Beyond character sheet importer (where legally permitted) `[L]` ⚠️
- [ ] Obsidian / Markdown notes import `[M]`
- [ ] Roll20 campaign data import (best effort) `[L]` ⚠️

### System-Agnostic Extensions

- [ ] Abstract 5e-specific logic behind a `ruleSystem` interface `[L]`
- [ ] Pathfinder 2e adapter as proof-of-concept `[XL]`
- [ ] Custom homebrew system support (free-form stat blocks) `[L]`

---

## Cross-Cutting Concerns

These aren't bound to a phase — they should start early and continue throughout.

### Testing

- [ ] Unit tests: dice logic, HP math, condition duration, state reducers `[L]` 🔑
- [ ] Integration tests: campaign create → session → combat flow `[L]`
- [ ] E2E tests: auth, create campaign, add character, start session `[L]`
- [ ] AI evaluation harness: fixture campaign + golden retrieval results `[L]` ⚠️
- [ ] Load tests: concurrent sessions, Inngest throughput `[M]`

### Security & Privacy

- [ ] Threat model review (especially around player-scoped auth) `[M]` ⚠️ 🔑
- [ ] Prompt injection defenses on user-generated content fed to LLMs `[L]` ⚠️ 🔑
- [ ] Secrets management audit (never client-side, rotate regularly) `[M]`
- [ ] Data export (GDPR/CCPA) + account deletion flow `[L]` 🔑
- [ ] Privacy policy, terms of service, DPA drafts `[M]` ⚠️
- [ ] Discord bot OAuth scope audit (request minimum needed) `[S]`

### Performance

- [ ] First-contentful-paint budget for DM dashboard (<2s) `[M]`
- [ ] WebSocket reconnection handling on network drop `[M]`
- [ ] Streaming LLM responses everywhere user-facing `[L]` 🔑
- [ ] Database query review: every N+1 eliminated, indexes verified `[M]`

### Rate Limiting & Abuse Prevention

- [ ] Per-user, per-endpoint rate limits (Upstash ratelimit) `[M]` 🔑
- [ ] Hard session cost cap (fail closed, not open) `[M]` 💰 🔑
- [ ] Monitoring + alerts on cost anomalies per user `[M]` 💰

### Legal & Content

- [ ] Confirm SRD 5.1 attribution meets CC-BY requirements `[S]` ⚠️ 🔑
- [ ] Image generation usage rights review (Flux license) `[S]` ⚠️
- [ ] Voice cloning policy: only ElevenLabs library voices, no user-uploaded likenesses `[S]` ⚠️
- [ ] Trademark review: product name, logo `[M]`

### Documentation

- [ ] Architecture decision records (ADRs) for major choices `[ongoing]`
- [ ] User-facing docs: getting started, Discord bot setup, troubleshooting `[L]`
- [ ] Internal runbook: deploy, rollback, incident response `[M]`

### Beta & Launch

- [ ] Private alpha with 3–5 DMs you know, qualitative interviews `[L]` ⚠️ 🔑
- [ ] Feedback loop: weekly calls, instrumented sessions, direct user research `[ongoing]`
- [ ] Closed beta with waitlist `[M]`
- [ ] Launch checklist: legal, billing, monitoring, support channel `[M]`
- [ ] Community: Discord server, subreddit presence, TTRPG creator outreach `[ongoing]`

---

## Suggested Milestones & Rough Sequencing

A realistic path for a single intermediate developer working evenings/weekends:

| Milestone                                  | Phases                  | Rough duration |
| ------------------------------------------ | ----------------------- | -------------- |
| M1: Skeleton live                          | Phase 0                 | 2–3 weeks      |
| M2: I can actually run a session with this | Phase 1                 | 6–10 weeks     |
| M3: It hears me                            | Phase 2                 | 4–6 weeks      |
| M4: It remembers                           | Phase 3                 | 5–8 weeks      |
| M5: It can voice an NPC                    | Phase 4                 | 4–6 weeks      |
| M6: Full product                           | Phase 5                 | 5–7 weeks      |
| M7: Launch-ready                           | Phase 6 + cross-cutting | 4–6 weeks      |

**Total: ~7–11 months part-time to full launch.** Multiply by 0.4–0.6 for a dedicated full-time effort.

The right forcing function is to **use it yourself** from M2 onward in a real campaign you're running. Every feature added afterward should be responding to a specific pain you hit at the table, not speculating about what might be useful. This is the single best way to avoid building things DMs don't actually want.

---

## Top 10 Tasks to Pay Extra Attention To

These are the places where getting it wrong costs the most — in either money, time, or product quality.

1. **Prompt caching foundation (Phase 1)** — if this is wrong, every subsequent LLM call is 5–10× more expensive than it needs to be.
2. **Gate 1 pattern matcher (Phase 2)** — the cheapest and most important check. 70% of your cost savings live here.
3. **Hybrid search + RRF (Phase 3)** — retrieval quality is the ceiling on how "smart" the Copilot feels.
4. **Session token budget with graceful downgrade (Phase 3)** — the difference between a predictable subscription and an unrunnable business.
5. **Scoped knowledge enforcement for NPC agents (Phase 4)** — leakage here breaks the entire trust model. Needs a test harness.
6. **Player-facing view auth scoping (Phase 5)** — if a player can see DM notes, the product is dead. Threat-model it carefully.
7. **Per-user hard cost cap (Cross-cutting)** — fail closed. One runaway user can wipe out a month of margin.
8. **RLS policies on Supabase (Phase 1)** — a single wrong policy leaks other DMs' campaigns.
9. **SRD attribution compliance (Cross-cutting)** — free to get right, expensive to get wrong.
10. **Early user research with real DMs (Beta)** — the only defense against building a beautiful tool nobody actually wants.
