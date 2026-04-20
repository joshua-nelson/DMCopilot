# D&D Dungeon Master Copilot

**Design Document — Version 0.2 (Working Draft)**

_Updated with cost, embedding, orchestration, and gating architecture_

---

## 1. Overview

### 1.1 Product Summary

The DM Copilot is a web application that assists a human Dungeon Master running a Dungeons & Dragons 5e game. It is explicitly **not** an AI dungeon master. The human DM remains the creative lead. The Copilot handles the cognitive overhead that drains a DM during play: taking notes, remembering continuity, tracking combat, voicing bit-part NPCs, and surfacing relevant hints at the right moment.

### 1.2 Design Principles

- **The DM is the author.** The tool never surprises players directly. All AI output is reviewed by the DM before it reaches the table.
- **Glanceable over detailed.** A running DM has ~1 second to parse any piece of UI. Information density must serve speed, not completeness.
- **Proactive but configurable.** The assistant can surface hints unprompted, but the DM controls how loud it is via an intensity slider.
- **Fluid UI.** Panels appear, shrink, or collapse based on the current phase of play (exploration, roleplay, combat). Persistent elements are minimized to status indicators.
- **Works both in-person and online.** Audio capture is delegated to Discord, eliminating the need to build or operate voice-call infrastructure.
- **D&D 5e first.** Using SRD 5.1 (CC-licensed) content. System-agnostic support is a later concern.
- **Cost-conscious by design.** Every feature is architected assuming AI calls cost real money. Embeddings, caching, gating, and async orchestration are primary tools, not afterthoughts.

### 1.3 Target User

The primary user is a D&D 5e Dungeon Master running a campaign for 3–6 players. They may run online (Discord voice, VTT) or in-person (everyone at a table, one laptop with mic). They care about narrative continuity across long campaigns, and the cognitive load of simultaneously narrating, improvising NPCs, tracking combat, and remembering what happened three months ago is the specific pain point being solved.

---

## 2. Core Features

### 2.1 Session Scribe

Records the session, transcribes it with speaker attribution, and produces structured notes.

- Live audio capture via Discord bot (voice channel) or direct browser mic (in-person)
- Real-time speech-to-text with speaker diarization (who said what)
- Manual DM corrections and annotations layered on top of the transcript
- Post-session summary: events, NPCs encountered, loot, decisions, unresolved threads, cliffhangers
- Full-text and semantic search across every prior session

### 2.2 Campaign Memory & Suggestions

The long-term brain of the campaign. Turns accumulated session notes into retrievable, actionable context during play.

- Semantic + keyword hybrid search across every prior session transcript, summary, and DM note
- **Callback suggestions:** when players return to a location or topic, the Copilot surfaces what happened there before
- **Contradiction detection:** flags when the DM says something that conflicts with established canon (narrow trigger — see Section 8)
- **Foreshadowing tracker:** DM tags narrative seeds; Copilot reminds them if the thread has gone untouched for too long
- **Relationship & faction tracker:** maintains a graph of how each NPC and faction views the party, updated from session events

### 2.3 NPC Agents

Lightweight AI personas the DM can "hand the mic" to for roleplay-heavy scenes, particularly for minor NPCs where the DM doesn't want to break flow with a voice and character shift.

- Per-NPC profile: personality, voice, goals, secrets, speech patterns, knowledge
- DM approval flow: the agent proposes dialogue; the DM approves, edits, or replaces before it reaches players
- "Whisper" channel: DM can privately steer the agent mid-conversation
- ElevenLabs voice per NPC (optional), streamed to Discord voice channel or local playback
- Scoped knowledge: each agent only "knows" what its NPC plausibly would, preventing leaks

### 2.4 Player & Combat Tracker

Structured game state that is the source of truth for mechanical facts (HP, AC, conditions, inventory), decoupled from the narrative.

- Player roster with full 5e character sheet: stats, HP, AC, saves, skills, features, spell slots
- Glanceable status strip: one line per player showing HP bar, AC, conditions — always visible
- Initiative tracker with turn order, round counter, concentration tracking, duration timers
- One-click damage / healing / condition application
- Monster stat blocks inline in combat (SRD creatures available; custom creatures supported)
- Hidden rolls and secret HP for monsters (DM-only)

### 2.5 Prep Assistant

Pre-session tool. The DM describes their next session; the Copilot helps flesh it out, drawing on the campaign's established lore to keep everything consistent.

- NPC generation with names, appearance, motivations, and a proposed voice
- Random encounter tables tuned to party level and biome
- Rumor and hook generation consistent with known factions and plot threads
- Location descriptions with boxed-text read-aloud
- Loot generation balanced to party level

### 2.6 Rules Lookup

Fast, searchable D&D 5e SRD reference. The DM types or speaks a question; the answer appears inline without navigating away. Triggered on demand or by a narrow set of transcript keywords — never ambient.

- Full SRD 5.1 corpus embedded and indexed
- Natural-language queries backed by Claude Haiku for interpretation
- Citations to the rule source so the DM can verify

### 2.7 Handouts & Reveals

The DM pushes content to players mid-session: a map, an NPC portrait, a letter, a vision.

- Pre-prepared handouts uploaded during prep
- On-the-fly image generation (Flux / SDXL via Replicate or fal.ai)
- Push to Discord channel or player-facing view

### 2.8 Player-Facing View

A separate, read-only interface players open on their own device. Shows their character, current initiative order, and handouts. The DM screen remains private.

### 2.9 Session Recap Generator

Between-session artifact. "Previously on..." style summaries the DM can share with the group. Two modes: tidy bullet notes, or narrative prose written in the campaign's voice.

---

## 3. Architecture

### 3.1 High-Level Diagram

```
[ DM browser ] ──── Next.js app ──┬──── Postgres (state, memory)
                                   ├──── pgvector (semantic memory)
                                   ├──── Redis (cache, queues)
                                   ├──── Claude API (Haiku/Sonnet/Opus)
                                   ├──── Voyage AI (embeddings, rerank)
                                   ├──── ElevenLabs (voice synthesis)
                                   ├──── Flux/SDXL (image gen)
                                   └──── Supabase Realtime (sync, player view)

[ Discord voice ] ── Discord bot ── Deepgram STT ──── Next.js ingest
[ Player browser ] ── Next.js (read-only) ──── Supabase Realtime
[ Inngest ] ── orchestrates async fan-out across all AI workers
```

### 3.2 Tech Stack

#### Frontend

- **Next.js 15 (App Router) + TypeScript.** Server components keep API keys server-side; streaming responses feel live.
- **Tailwind + shadcn/ui.** Fast to build; easy to theme.
- **Zustand or Jotai.** Lightweight client state for the fluid, panel-based UI.
- **dnd-kit.** Drag-and-drop for initiative and panel rearrangement.

#### Backend

- **Next.js API routes / server actions.** Most game mutations go here.
- **Supabase Realtime** for live sync between DM, player view, and Discord bot.
- **Inngest** for async orchestration — fan-out/fan-in LLM workflows with retries and observability.
- **Discord.js bot** as a separate deployable service. Captures per-user audio streams, forwards to transcription.

#### Data

- **Supabase Postgres.** Relational state: users, campaigns, characters, NPCs, sessions, encounters.
- **pgvector extension.** Embedded session chunks, NPC profiles, SRD rules for semantic retrieval.
- **Postgres tsvector** for full-text search; combined with pgvector for hybrid retrieval.
- **Upstash Redis.** Per-session retrieval cache, rate limits, in-flight concurrency tracking.
- **Cloudflare R2.** Generated images, TTS audio, session audio recordings.

#### AI & Media

- **Claude (Anthropic).** Haiku 4.5 workhorse, Sonnet 4.6 for nuanced work, Opus 4.7 rarely for high-stakes narrative.
- **Voyage AI.** Dedicated embedding models (voyage-3-lite / voyage-3-large) and reranker. Dramatically cheaper than using an LLM for retrieval.
- **Deepgram.** Streaming STT with speaker diarization.
- **ElevenLabs.** Streaming TTS for NPC voices.
- **Flux (via Replicate or fal.ai).** Scene and NPC portrait generation. Async.

#### Auth, Deploy, Monitoring

- **Clerk** or Supabase Auth for user accounts.
- **Vercel** for the web app; Railway or Fly.io for the Discord bot.
- **Sentry** for errors; PostHog for product analytics.

### 3.3 Discord Bot as Audio Layer

- Players and DM join a Discord voice channel as they would for any online session
- In-person: room's mic joins the channel, or the DM's laptop alone picks up the table
- Bot receives per-user audio streams (Discord separates them automatically), forwards to Deepgram
- Transcribed text, tagged with user ID, pushed to the app via realtime
- TTS playback: bot plays ElevenLabs audio back into the voice channel on DM trigger
- Handouts: bot can post images/text to a designated Discord text channel

---

## 4. UI / UX Design

### 4.1 Fluid Layout Model

The DM screen is not a fixed dashboard. It is a set of panels that expand, shrink, and reorder based on the current phase of play. The DM can override any automatic layout change.

#### Phases

- **Exploration:** Notes, scribe transcript, map/handout prep, rules lookup prominent. Combat collapsed to player status strip.
- **Roleplay:** Active NPC agent panel prominent, scribe live, memory hints active. Combat collapsed.
- **Combat:** Initiative tracker, current turn, monster stats, player HP/AC expanded. Scribe auto-collapses.
- **Prep (between sessions):** Different mode entirely. Prep assistant, memory browsing, session recap generator, NPC/encounter building.

#### Persistent Elements

- Player status strip — one row, HP bar + AC + condition icons per PC
- Scribe indicator — recording status + last spoken line
- Proactivity slider — DM's current assistance intensity
- Budget indicator — small gauge showing session token usage vs. cap
- Quick actions — new NPC, roll, search, pause

### 4.2 Proactivity Slider

A 0–3 slider controlling how actively the Copilot surfaces information. Settable per-session or mid-session.

| Level | Name      | Behavior                                                                                    |
| ----- | --------- | ------------------------------------------------------------------------------------------- |
| 0     | Silent    | Only responds when the DM explicitly asks. Pure reference tool.                             |
| 1     | Subtle    | Minor indicators in the corner when something relevant is retrievable. No pop-ups.          |
| 2     | Active    | Surfaces callbacks, contradictions, hints as inline cards. Debounced to ~20s between scans. |
| 3     | Assertive | Proposes full NPC responses, suggests twists, drafts flavor. DM approves before use.        |

### 4.3 Key Interactions

- **Glance loop:** DM looks at screen for <1s, gets player HP / current turn / last line spoken, looks back at players.
- **Poke loop:** DM taps a status indicator to expand detail, resolves action, collapses.
- **Hand-the-mic loop:** DM selects an NPC, types or speaks a directive, reviews proposed line, hits approve — line is spoken in the voice channel.
- **Capture loop:** Scribe records continuously. DM can tap any moment in the transcript to flag (event, foreshadowing, secret, decision).

---

## 5. Data Model (Preliminary)

Only central entities; full schema elaborated during implementation. All tables assume a UUID primary key and timestamps unless noted.

| Table                 | Purpose & key columns                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `campaigns`           | User-owned container. name, setting_summary, tone, dm_user_id, active_session_id                   |
| `users`               | Auth entity. Roles: dm, player.                                                                    |
| `sessions`            | One game night. campaign_id, started_at, ended_at, phase, summary_json, token_budget_used          |
| `characters`          | PC or NPC. campaign_id, name, type (pc/npc/monster), sheet_json, portrait_url, voice_id, aliases[] |
| `npc_agents`          | Agent config extending characters. personality, goals, secrets, knowledge_scope, speech_style      |
| `encounters`          | Combat instance. session_id, round, active_turn_idx, participants_json                             |
| `transcript_segments` | Per-utterance. session_id, speaker_id, text, started_at, duration_ms, annotations, gate_flags_json |
| `events`              | DM-flagged or AI-extracted happenings. session_id, type, summary, refs, session_ts                 |
| `memory_chunks`       | Embedded text. source_type, source_id, text, embedding vector, summary, fts tsvector               |
| `relationships`       | Graph edge. from_entity, to_entity, kind, value, rationale                                         |
| `handouts`            | Asset revealed to players. campaign_id, type, url, revealed_at                                     |
| `rules_chunks`        | SRD content, embedded. section, text, embedding, fts tsvector                                      |
| `proper_nouns`        | Pattern-match dictionary per campaign — NPC names, locations, items. Used by Gate 1 filtering.     |

---

## 6. Memory & Retrieval System

The subsystem that determines whether the Copilot feels like it remembers your campaign or just regurgitates noise.

### 6.1 Three-Tier Memory

- **Tier 1 — Working memory:** Last ~20 transcript segments + current encounter state. Injected into every LLM call.
- **Tier 2 — Session summaries:** After each session, Claude generates a structured summary (events, NPCs, decisions, loot, threads). Stored as a first-class record and embedded.
- **Tier 3 — Semantic retrieval:** All summaries, flagged events, NPC profiles, and transcript chunks embedded into pgvector. Retrieval injects top-k results on-demand.

### 6.2 Canonical State vs. Narrative

- **Canonical state** (HP, inventory, location, active quests, relationships) lives in structured DB tables. The LLM is never the source of truth.
- **Narrative text** (descriptions, dialogue, flavor) can be generated, rewritten, or summarized freely.

LLM calls that propose state changes must output them as structured tool-use JSON; a server handler validates and applies them to the DB. Prose stays prose.

### 6.3 Sliding Window + Rolling Summaries

Transcripts grow unbounded. To keep the volatile context small:

- Always in working context: last 20 transcript segments (raw)
- Every 50 segments: Haiku condenses older raw text into a scene summary. Raw text is archived but not in context.
- Older scenes: only their summaries live in working context. Full text retrieved on-demand via hybrid search.
- Result: working context size stays roughly constant (~5–8K tokens) regardless of session length.

---

## 7. Embedding & Retrieval Strategy

**Principle:** embeddings are for search and classification; LLMs are for generation and reasoning. Most tasks that look like they need an LLM are actually retrieval problems in disguise — and embeddings solve them for ~1/100th the cost.

### 7.1 What Gets Embedded

#### At write time (one-time cost per artifact)

- Every transcript segment, chunked by scene (~500 tokens each) — voyage-3-lite
- Every session summary — voyage-3-large
- Every flagged event (decisions, foreshadowing, NPC meets, loot) — voyage-3-large
- NPC profiles (personality, appearance, knowledge, relationships) — voyage-3-large
- Location descriptions — voyage-3-large
- Handouts and lore documents — voyage-3-large
- The entire SRD 5.1 corpus (one-time ingest) — voyage-3-large

#### At query time (cheap, sub-cent per query)

- Recent transcript segments (to find related memories)
- DM command-bar queries
- NPC names or topics that just came up in transcript

### 7.2 What Embeddings Replace

Each of these was an LLM task in a naive design; each is now retrieval-first.

| Task                                | Naive (LLM) approach         | Embedding-first approach                                |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Has this NPC been mentioned before? | LLM scans full history       | Vector search for NPC name → return hits                |
| Find related past events            | LLM reads all summaries      | Vector search → top-k chunks                            |
| Which rule applies here?            | LLM with full SRD in context | Vector search SRD → LLM reads only top 3 chunks         |
| Is this contradicting canon?        | LLM reads all lore           | Embed new claim, find nearest canon, compare only those |

### 7.3 Hybrid Retrieval

Pure semantic search misses things exact matching catches, and vice versa. The retrieval stack combines both:

1. **Structured queries first (free).** If the DM types @npc or mentions an entity in the characters table, do a direct DB lookup. No embedding or LLM needed.
2. **Hybrid search.** Run pgvector semantic search AND Postgres tsvector full-text search in parallel. Merge with Reciprocal Rank Fusion (RRF). No LLM.
3. **Rerank if stakes warrant.** For high-stakes retrievals (contradiction detection), rerank top ~20 results with Voyage rerank — much cheaper than Haiku.
4. **Only then call the LLM** with the top 3 results as context.

### 7.4 Retrieval Cache

When an entity is retrieved, cache the retrieval in Redis for the duration of the scene (default 3 minutes, refreshed on reuse). If multiple players mention the same NPC in quick succession, the retrieval runs once, not per-mention. This is an embedding-search cache, parallel to the LLM prompt cache — equally powerful, nearly free to implement.

---

## 8. Check Gating & Cost Control

Not every transcript segment warrants every check. Running all checks on every segment is how bills balloon and DMs get drowned in noise. Each check sits behind progressively more expensive gates; most segments never pass Gate 1.

### 8.1 Three-Gate Filter

#### Gate 1 — Pattern rules (free, zero tokens)

Before any model touches the segment, run dumb pattern checks against the campaign's proper_nouns dictionary and keyword sets:

- Contains a known NPC name → trigger memory retrieval
- Contains a known location → trigger location callback
- Contains rules keywords ("does", "can I", "DC", "save", spell names) → trigger rules lookup
- Contains a question directed at the DM → higher weight for proactive help
- Speaker is DM vs. player → different handling
- Segment < 4 words → skip everything

**Expected filter rate: 70–80% of segments eliminated at Gate 1.**

#### Gate 2 — Classifier call (~$0.0001 per call)

For segments that pass Gate 1 but it's unclear which checks are warranted, one small Haiku call with a cached classifier prompt returns structured flags:

```json
{
  "needs_rules_lookup": false,
  "needs_memory_retrieval": true,
  "memory_topic": "Davin tower",
  "needs_contradiction_check": false,
  "combat_action_detected": false,
  "roleplay_moment": true
}
```

200-token input (cached) + 50-token output. Only true flags fire downstream work.

#### Gate 3 — Actual check work

Only flagged checks run. Most segments that pass Gate 2 need 0–2 checks, not all five.

### 8.2 Check-Specific Tactics

- **Rules checks: on-demand only.** Never ambient. DM hits rules lookup or a player asks a rules-shaped question (Gate 1). Policing every narrated action for rule correctness is annoying, not useful.
- **Contradiction detection: DM statements only.** Only run when (a) speaker is the DM, (b) the statement references an entity already in the DB, (c) it contains factual claims. A player's wrong guess doesn't need flagging.
- **Memory retrieval: triggered, not ambient.** Fires on Gate 1 keyword hit or on scene change. Not on every segment.
- **Proactive suggestions: debounced.** Scans accumulated buffer every ~20s at level 2, 30s at level 3. One call covers a conversation chunk, not each line.
- **Event extraction: batched.** Runs every ~30s on the accumulated buffer. It's extracting loot/decisions/NPCs-met for later retrieval, not real-time.
- **Combat & DM commands: real-time.** Only these two categories truly need per-segment responsiveness.

### 8.3 Session Token Budget

Each session has a budget, split between reactive and proactive work:

- **Reactive** (DM asked, player triggered a rule lookup): no cap — always serve these.
- **Proactive** (ambient scans, contradiction checks, foreshadowing): capped — e.g., 50K input tokens/session at level 2, 150K at level 3.

At 80% of budget, the Copilot gracefully downgrades proactivity level and notifies the DM ("Subtle mode for the rest of this session — over budget"). The DM can override. This makes the upper bound on session cost knowable, not probabilistic — subscription pricing becomes confident, not a gamble.

### 8.4 DM Override Always Wins

The filtering is a cost-saving default, not a policy. A small "checks" dropdown near the proactivity slider lets the DM toggle any check on or off — "shut up about continuity tonight, I'm improvising" or "run rules-strict for this combat." The system serves the DM, never second-guesses them.

### 8.5 Per-Session Math

Typical 4-hour session: ~240 transcript segments.

- ~180 eliminated at Gate 1 (silence, short phrases, no triggers) — zero cost
- ~60 reach the classifier — ~$0.01 total
- Of those, maybe 30 trigger memory retrieval, 10 rules lookup, 5 contradiction check
- Batched + cached retrieval reduces those ~45 checks to ~15 actual LLM calls

**Total cost for the analysis layer: ~$0.30–0.60 per session.**

---

## 9. Async Orchestration

During any DM beat (player speaks, NPC summoned, combat action), multiple systems can run in parallel instead of serially blocking each other. The architecture is an event bus with fan-out, not a call chain.

### 9.1 Event Bus Pattern

Every meaningful event is published to a queue. Multiple workers subscribe. They fire in parallel. The DM UI subscribes to results and streams each piece in as it arrives.

**Example: new transcript segment arrives. Five things happen simultaneously:**

```
transcript.segment.created
  ├─ [A] Embed segment → pgvector              (Voyage, ~50ms)
  ├─ [B] Gate 1 pattern match                   (free, ~1ms)
  ├─ [C] If passed Gate 1 → classifier          (Haiku, ~500ms)
  ├─ [D] If combat flag → update tracker        (Haiku, ~500ms)
  └─ [E] Proactivity scan (debounced, lvl ≥ 2)  (Sonnet, ~1.5s)
```

No worker blocks another. The slowest (proactivity scan) doesn't delay the fastest (embedding) from completing and surfacing.

### 9.2 NPC Agent Turn (Parallel Retrieval + Streaming)

When the DM hands the mic to an NPC, retrievals fan out in parallel, then generation + TTS stream concurrently:

```
npc.dialogue.requested
  ├─ [1] Vector search for NPC's prior appearances    (Voyage, ~100ms)
  ├─ [2] Vector search lore the NPC knows             (Voyage, ~100ms)
  ├─ [3] Pull structured NPC sheet from DB            (~10ms)
  │
  │   (1–3 complete, feed into…)
  ├─ [4] Claude streams dialogue                       (Sonnet, ~1s to first token)
  └─ [5] ElevenLabs streams TTS audio concurrently     (~300ms to first audio)
```

ElevenLabs can begin speaking before Claude finishes generating. The DM sees text and hears audio nearly simultaneously with generation.

### 9.3 Background Pipelines (truly async, no user waiting)

- **Scene summarization** — every 50 segments, Haiku condenses older raw text. Queued.
- **Session summary** — at session end, Sonnet via Batch API (50% off).
- **Re-embedding** — if an NPC profile changes, re-embed in the background.
- **Foreshadowing decay scan** — nightly job checking untouched threads. Batch API.
- **Weekly recap email** — Opus via Batch, weekly cron.

### 9.4 Orchestrator Choice: Inngest

Inngest is the recommended orchestrator. Its step functions express "do A, B, C in parallel, then D once all three complete" in readable TypeScript, with automatic retries, idempotency, and observability. Works natively with Next.js/Vercel. Alternatives considered: BullMQ on Upstash Redis (more control, more ops), Trigger.dev (similar philosophy).

### 9.5 Concurrency Ceilings

Per active session, to protect both the bill and Anthropic rate limits:

- Max 5 in-flight Haiku calls
- Max 2 in-flight Sonnet calls
- Max 1 Opus call at a time
- Proactive scans debounced to once per 20s
- On ceiling hit: queue (for important calls) or drop-oldest (for ambient scans)

### 9.6 Streaming Is Non-Negotiable

Anything the DM sees live must stream — Claude, Deepgram, ElevenLabs all support it. First-token latency is ~300–500ms; fully streamed feels instant because the human is reading while generating.

---

## 10. AI Model Routing & Caching

### 10.1 Model-per-Feature Matrix

| Feature                               | Model      | Why                                                     |
| ------------------------------------- | ---------- | ------------------------------------------------------- |
| Gate 2 classifier                     | Haiku 4.5  | Tiny cached prompt, structured output, very high volume |
| Event extraction (batched)            | Haiku 4.5  | Structured output, runs on buffered transcript chunks   |
| Rules lookup Q&A                      | Haiku 4.5  | Simple retrieval + short answer, SRD context cached     |
| Memory hint cards                     | Haiku 4.5  | Condense top-k retrieved chunks                         |
| Scene summarization (rolling)         | Haiku 4.5  | Compress older raw transcript to summary                |
| NPC agent dialogue                    | Sonnet 4.6 | Nuance & personality matter; lines are short            |
| Proactive suggestions (lvl 2–3)       | Sonnet 4.6 | Needs strong narrative comprehension                    |
| Contradiction detection               | Sonnet 4.6 | Subtle reasoning required, but narrowly triggered       |
| Post-session summary (batch)          | Sonnet 4.6 | Async — use Batch API for 50% off                       |
| Prep assistant (batch where possible) | Sonnet 4.6 | Quality matters; mostly async                           |
| Narrative recap ("previously on…")    | Opus 4.7   | Low volume, quality matters, via Batch (50% off)        |
| Heavy NPC scenes (villain monologue)  | Opus 4.7   | DM opts in explicitly — rare                            |
| All embeddings                        | Voyage AI  | Dedicated embedding model, ~50× cheaper than LLM        |

**Approximate distribution: ~70% Haiku, ~25% Sonnet, ~5% Opus.** Mirrors the routing approach that cuts cost 50–70% vs. running everything on a single mid-tier model.

### 10.2 Prompt Cache Architecture

Every in-session prompt is layered most-stable-to-most-volatile, so cache breakpoints hit reliably.

| Layer    | TTL    | Contents                                                                     |
| -------- | ------ | ---------------------------------------------------------------------------- |
| Static   | 1 hour | System prompt, output schemas, safety rules, SRD reference (when needed)     |
| Campaign | 5 min  | Campaign bible, PC character sheets, top-20 NPCs (rarely change mid-session) |
| Session  | 5 min  | Top-k retrieved memory chunks, current encounter state                       |
| Volatile | Never  | Last 20 transcript segments + specific trigger                               |

Cache reads cost ~10% of the standard input rate. For this app, the cacheable fraction is ~85–90% because the campaign bible and character sheets barely change during a session. Effective input rate on Sonnet drops from $3/M to ~$0.40/M in practice.

### 10.3 Output Token Discipline

- **Structured output via tool use,** not JSON embedded in prose. Shorter output, reliable parsing, and the model doesn't generate unnecessary filler.
- **Aggressive max_tokens caps** per feature — classifier 100, hint card 200, NPC dialogue 400, narrative recap 2000. Output is ~5× the input cost; cap it.
- **Prefer retrieval-narrow prompts** over kitchen-sink prompts. Send 3 relevant chunks, not 20 possibly-relevant ones.

### 10.4 Per-Session Cost

Assumptions: 4-hour session, Sonnet workhorse, 70/25/5 routing, full caching, Voyage embeddings, gating on.

| Line item                                         | Est. cost  |
| ------------------------------------------------- | ---------- |
| Gate 2 classifier (~60 calls, cached prompt)      | $0.01      |
| Event extraction (batched, ~8 calls)              | $0.08      |
| Memory retrieval + hint cards (Haiku, ~15 calls)  | $0.10      |
| NPC dialogue (Sonnet, ~30 calls)                  | $0.30      |
| Proactive suggestions at level 2 (Sonnet)         | $0.15      |
| Contradiction checks (Sonnet, narrow trigger, ~5) | $0.05      |
| Rules lookups (Haiku, ~10)                        | $0.05      |
| Scene summarization (Haiku, ~5)                   | $0.03      |
| Post-session summary (Sonnet batch)               | $0.05      |
| All embeddings (Voyage)                           | ~$0.01     |
| **TOTAL estimated per session**                   | **~$0.85** |

Uncached and ungated, the same workload runs $6–8 on Sonnet or $12+ on Opus. The gap between naive and thoughtful architecture is an order of magnitude — the difference between a sustainable subscription and a money pit.

### 10.5 Tokenizer Note

Opus 4.7 uses a new tokenizer that can produce up to 35% more tokens for the same text compared to 4.6. Even at the same sticker price, effective cost per unit of work is higher. For this app, default to Sonnet 4.6 and only reach for Opus when quality is clearly differentiated (narrative recaps, major reveals).

---

## 11. Phased Roadmap

### Phase 1 — Foundations (MVP)

- Auth, campaign creation, session lifecycle
- Character sheets (PCs) and basic combat tracker
- Manual notes during session
- Claude-powered post-session summary (via Batch API)
- Rules lookup over SRD 5.1 with hybrid search
- Prompt caching architecture in place from day one

### Phase 2 — The Scribe

- Discord bot with voice-channel capture
- Deepgram streaming transcription with speaker attribution
- Live transcript panel with one-click flagging
- Gate 1 pattern matching + Gate 2 classifier in place
- Event extraction (batched) from transcripts

### Phase 3 — Memory & Suggestions

- Voyage embedding pipeline + pgvector + tsvector hybrid search
- Retrieval cache in Redis
- Proactivity slider with budget tracking
- Callback surfacing and narrow-trigger contradiction detection
- Relationship/faction tracker
- Inngest orchestration for fan-out workflows

### Phase 4 — NPC Agents

- NPC profile editor with scoped-knowledge enforcement
- DM approval chat UI with whisper channel
- ElevenLabs streaming voice integration via Discord bot
- Parallel retrieval + streaming generation pattern

### Phase 5 — Prep & Polish

- Prep assistant (NPCs, encounters, rumors, locations, loot)
- Foreshadowing tracker with decay scans
- Handouts and on-the-fly image generation
- Player-facing view
- Session recap generator (bullet + narrative modes)

### Phase 6 — Scale & Monetization

- Multi-campaign dashboards
- Usage metering and subscription tiers (budget caps are already in place)
- Import tools (D&D Beyond character sheets where permitted)
- System-agnostic extensions (Pathfinder, Daggerheart)

---

## 12. Open Questions & Risks

### 12.1 Open Questions

- How long to retain raw session audio? (Privacy vs. ability to re-transcribe.)
- Should NPC agents be allowed to talk to each other without DM mediation?
- Do we support homebrew content input (monsters, items, spells) in Phase 1 or defer?
- Is there a "player mode" for solo use?
- How do we surface AI uncertainty — guessed vs. canonical?
- Should budget caps be per-session or monthly pool?

### 12.2 Risks

- **Cost runaway:** Mitigated by caching, gating, budget caps, and tiered routing — but must be monitored per-user. Hard session cap prevents individual runaways.
- **IP / copyright:** Stick to SRD 5.1 (CC-BY). Do not train or index the PHB, MM, or non-SRD WotC material.
- **Latency:** Streaming everywhere; parallel fan-out; cache warm; canned phrases for NPCs that repeat.
- **DM distraction:** The single biggest failure mode. Prioritize user research with real DMs from Phase 2. Budget/gating defaults err on quiet.
- **Discord dependency:** Abstract the audio pipeline so another transport can be added later.
- **Embedding drift:** If we switch embedding models later, all indices need re-embedding. Version the embedding model per chunk to allow gradual migration.

---

## 13. Success Metrics

- **Sessions per active DM per month** (target: 2+, matches typical cadence)
- **DM-approval rate of AI suggestions** (target: >60% kept, not dismissed)
- **Time from session end to usable summary** (target: <2 minutes)
- **Return rate — DM uses for 3+ consecutive sessions** (target: 70%)
- **Median cost per session** (target: <$1 at full feature use)
- **P95 cost per session** (target: <$2 — budget caps should make this tight)
- **Cache hit rate on in-session prompts** (target: >80%)
- **Gate 1 elimination rate** (target: 70–80% of segments filtered for free)

---

_— End of Document —_
