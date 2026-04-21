# Phase 1 Completion Plan — AI Features Implementation

**Goal:** Implement the 7 critical missing Phase 1 features using OpenRouter with free models for testing.

**Status:** 60% complete → 100% complete
**Timeline:** 2-3 weeks (full-time) or 6-8 weeks (part-time)

---

## Architecture Decisions

### 1. OpenRouter Integration Strategy

**Why OpenRouter:**
- Free tier models available for testing (google/gemini-flash-1.5-8b, meta-llama/llama-3.2-3b-instruct)
- Drop-in replacement for Anthropic SDK (OpenAI-compatible API)
- Easy migration to paid Anthropic models in production via config switch
- Cost tracking already built in `trackAICall()`

**Implementation:**
- Use `openai` npm package (OpenRouter is OpenAI-compatible)
- Environment variable to switch between OpenRouter (dev) and Anthropic (prod)
- Abstraction layer: `src/lib/ai/client.ts` that returns the right client
- Free models for development:
  - **Fast/cheap:** `google/gemini-flash-1.5-8b` (free, 1M context)
  - **Quality:** `anthropic/claude-3.5-haiku` (cheap, or use free alternatives)
  - **Embeddings:** Use OpenRouter's embedding endpoint or PostgreSQL's built-in text search initially

### 2. Development vs Production Model Routing

```typescript
// src/lib/ai/config.ts
export const AI_CONFIG = {
  mode: process.env.AI_MODE || 'dev', // 'dev' | 'prod'
  dev: {
    provider: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: {
      fast: 'google/gemini-flash-1.5-8b', // Free
      quality: 'meta-llama/llama-3.2-11b-vision-instruct:free', // Free
      embeddings: null, // Use PostgreSQL text search for now
    }
  },
  prod: {
    provider: 'anthropic',
    models: {
      fast: 'claude-3-5-haiku-20241022',
      quality: 'claude-3-5-sonnet-20241022',
      embeddings: 'voyage-3-large',
    }
  }
}
```

### 3. Embedding Strategy (Two-Phase)

**Phase 1A (MVP - This Sprint):**
- Use PostgreSQL's `tsvector` full-text search only
- No semantic embeddings yet
- Sufficient for rules lookup and basic search
- Zero external API costs

**Phase 1B (Post-MVP):**
- Add Voyage AI embeddings (production)
- Or use free OpenRouter embeddings if quality sufficient
- Hybrid search (semantic + keyword)

---

## Feature Implementation Plan

### Priority 1: AI Infrastructure Foundation (Week 1)

**Tasks:**
1. ✅ Install dependencies
2. ✅ OpenRouter client abstraction
3. ✅ Prompt caching utilities
4. ✅ Environment configuration
5. ✅ Cost tracking integration

**Files to Create:**
- `src/lib/ai/client.ts` - AI client factory
- `src/lib/ai/config.ts` - Model routing config
- `src/lib/ai/prompts/builder.ts` - Layered prompt utility
- `src/lib/ai/prompts/cache.ts` - Cache control helpers
- `.env.example` updates - Add OPENROUTER_API_KEY

**Dependencies:**
```bash
npm install openai zod
```

**Acceptance Criteria:**
- ✅ Can make AI calls via OpenRouter with free models
- ✅ All calls tracked in `ai_calls` table
- ✅ Prompt builder supports layered context with cache breakpoints
- ✅ Environment toggle works (dev/prod mode)

---

### Priority 2: SRD 5.1 Ingestion Pipeline (Week 1-2)

**Tasks:**
1. ✅ Download SRD 5.1 (CC-BY) corpus
2. ✅ Parse into logical chunks (spells, rules, monsters, items)
3. ✅ Build tsvector full-text search index
4. ✅ Seed `rules_chunks` table
5. ✅ Attribution compliance (CC-BY)

**Files to Create:**
- `scripts/ingest-srd/download.ts` - Fetch SRD from official source
- `scripts/ingest-srd/parse.ts` - Parse markdown/JSON to chunks
- `scripts/ingest-srd/seed.ts` - Insert into DB with tsvector
- `supabase/sql/rules_search_function.sql` - Search function
- `public/srd-5.1/` - Raw SRD files (gitignored, downloaded locally)

**Data Source:**
- Official WotC SRD 5.1: https://dnd.wizards.com/resources/systems-reference-document
- Or community-maintained: https://github.com/BTMorton/dnd-5e-srd

**Schema Updates:**
```sql
-- Already exists in 07_phase2_stubs.sql, verify structure:
CREATE TABLE rules_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- "SRD 5.1 (CC-BY)"
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rules_chunks_fts ON rules_chunks USING GIN (fts);
CREATE INDEX idx_rules_chunks_section ON rules_chunks (section);
```

**Acceptance Criteria:**
- ✅ ~500-1000 rule chunks in database
- ✅ Full-text search returns relevant results for queries like "grapple", "fireball", "advantage"
- ✅ Every chunk has source attribution
- ✅ Idempotent script (can re-run without duplicates)

---

### Priority 3: Rules Lookup Feature (Week 2)

**Tasks:**
1. ✅ Command bar component (⌘K trigger)
2. ✅ Search endpoint with tsvector ranking
3. ✅ AI Q&A with free model (Gemini Flash or Llama)
4. ✅ Citation display UI
5. ✅ Recent queries cache

**Files to Create:**
- `src/components/command-bar/rules-lookup.tsx` - Command palette
- `src/app/api/rules/search/route.ts` - Search API
- `src/app/api/rules/qa/route.ts` - AI Q&A endpoint
- `src/lib/ai/prompts/rules-qa.ts` - Rules Q&A prompt
- `src/components/rules/citation-card.tsx` - Display chunk with source

**UI/UX:**
- Global keyboard shortcut: `⌘K` or `Ctrl+K`
- Modal overlay with search input
- Instant text search results (debounced 300ms)
- "Ask AI" button for natural language interpretation
- Results show: chunk title, snippet, source citation, relevance score
- Click to expand full text

**Search Algorithm:**
```typescript
// Two-mode search:
// 1. Text search: tsvector ranked by ts_rank
// 2. AI Q&A: Send top 3 chunks to LLM with question

// Example query:
SELECT id, section, title, content, source,
       ts_rank(fts, websearch_to_tsquery('english', $1)) as rank
FROM rules_chunks
WHERE fts @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 10;
```

**Prompt Template:**
```typescript
// src/lib/ai/prompts/rules-qa.ts
export function buildRulesQAPrompt(question: string, chunks: RuleChunk[]) {
  return {
    system: `You are a D&D 5e rules assistant. Answer concisely based on the SRD excerpts provided. Always cite the source section.`,
    user: `Question: ${question}\n\nRelevant SRD sections:\n${chunks.map(c => `[${c.section}]\n${c.content}`).join('\n\n')}`,
  }
}
```

**Acceptance Criteria:**
- ✅ ⌘K opens command bar from any page
- ✅ Text search returns results in <500ms
- ✅ AI Q&A works with free model
- ✅ Citations link to SRD source
- ✅ All AI calls tracked with `trackAICall()`

---

### Priority 4: Prompt Caching Foundation (Week 2)

**Tasks:**
1. ✅ Layered prompt builder utility
2. ✅ Cache control breakpoint injection (for Anthropic)
3. ✅ Cache hit rate metric logging
4. ✅ Unit tests for prompt layering

**Files to Create:**
- `src/lib/ai/prompts/builder.ts` - Core builder
- `src/lib/ai/prompts/layers.ts` - Layer types & schemas
- `src/lib/ai/prompts/__tests__/builder.test.ts` - Tests
- `src/lib/ai/prompts/cache.ts` - Cache utilities

**Architecture:**
```typescript
// Layered prompt structure (stable → volatile)
type PromptLayers = {
  static: string;      // System prompt, schemas (1hr TTL)
  campaign: string;    // Campaign context, PCs (5min TTL)
  session: string;     // Session notes, retrieved memory (5min TTL)
  volatile: string;    // Last 20 transcript segments, user query (never cached)
}

// Builder API
const prompt = new PromptBuilder()
  .addLayer('static', systemPrompt, { ttl: 3600 })
  .addLayer('campaign', campaignContext, { ttl: 300 })
  .addLayer('session', sessionContext, { ttl: 300 })
  .addLayer('volatile', userQuery)
  .build();

// For OpenRouter (no native caching):
// - Still structure prompts in layers for future Anthropic migration
// - Track prompt structure for cost analysis
// - Log "potential cache hit" metrics

// For Anthropic (production):
// - Inject cache_control breakpoints at layer boundaries
```

**Acceptance Criteria:**
- ✅ Prompt builder supports 4 layers
- ✅ Generates correct format for OpenRouter and Anthropic
- ✅ Cache hit rate logged to `ai_calls.cache_hit`
- ✅ Unit tests cover edge cases
- ✅ TypeScript types enforce layer ordering

---

### Priority 5: Persistent Status Strip (Week 2)

**Tasks:**
1. ✅ Create global player status component
2. ✅ Display HP bar, AC, condition icons
3. ✅ Click-to-expand inline sheet view
4. ✅ Integrate into all session layouts

**Files to Create:**
- `src/components/session/persistent-status-strip.tsx` - Main component
- `src/components/session/player-status-card.tsx` - Per-player card
- `src/components/session/quick-sheet-popover.tsx` - Expanded view
- `src/hooks/use-party-status.ts` - Realtime data hook

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Avatar] Thorin   ████████░░ 42/50 HP  AC 18  [💀poisoned]  │
│ [Avatar] Elara    ██████████ 32/32 HP  AC 14                │
│ [Avatar] Grimm    ████░░░░░░ 18/45 HP  AC 16  [🔥burning]   │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Sticky top bar (or collapsible sidebar)
- Color-coded HP bars (green/yellow/red)
- Condition icons with tooltips
- Click name → expand full sheet modal
- Visible on all session pages (notes, combat, etc.)
- Realtime updates via Supabase Realtime

**Acceptance Criteria:**
- ✅ Strip visible on all session pages
- ✅ Shows all PCs for current campaign
- ✅ HP updates in real-time
- ✅ Click expands to full sheet
- ✅ Mobile-responsive (collapsible)

---

### Priority 6: Post-Session Summary (Week 3)

**Tasks:**
1. ✅ Summary generation prompt
2. ✅ Trigger on session end
3. ✅ Structured JSON output (events, NPCs, loot, threads)
4. ✅ Display UI with edit capability
5. ✅ Background job (optional: integrate Inngest later)

**Files to Create:**
- `src/lib/ai/prompts/session-summary.ts` - Prompt builder
- `src/app/api/sessions/[sessionId]/summary/route.ts` - Generation endpoint
- `src/components/session/summary-display.tsx` - Display component
- `src/components/session/summary-editor.tsx` - Edit component

**Prompt Strategy:**
```typescript
// Input: session notes + combat log + character actions
// Output: Structured JSON via function calling

const summarySchema = {
  events: [
    { type: 'combat' | 'discovery' | 'decision' | 'npc_met', description: string }
  ],
  npcs_encountered: [{ name: string, role: string, relationship: string }],
  loot_gained: [{ item: string, quantity: number }],
  decisions_made: [{ choice: string, consequence: string }],
  unresolved_threads: [{ thread: string, last_mentioned: string }],
  next_session_hooks: [string]
}
```

**Free Model Approach:**
- Use `google/gemini-flash-1.5-8b` (free, good at structured output)
- Or `meta-llama/llama-3.2-11b-vision-instruct:free`
- If quality insufficient, use cheapest OpenRouter model

**Flow:**
1. DM clicks "End Session"
2. Shows confirmation dialog with "Generate Summary" checkbox
3. If checked, triggers async summary generation
4. Shows loading state → polls for completion
5. Displays editable summary
6. Saves to `sessions.summary_json`

**Future Enhancement (defer to Phase 2):**
- Batch API for 50% cost savings
- Background job with Inngest

**Acceptance Criteria:**
- ✅ Summary generates from session notes
- ✅ Structured JSON with all required fields
- ✅ Editable after generation
- ✅ Saved to database
- ✅ Display on session detail page

---

### Priority 7: Fluid Panel Layout (Optional - Can Defer)

**Status:** Not critical for MVP, defer to Phase 2+

**Alternative for MVP:**
- Fixed responsive layout with collapsible sections
- Phase-specific views (show/hide based on session phase)
- Good enough for testing, skip complex drag/drop for now

---

## Testing Strategy

### Unit Tests (Vitest)
- `src/lib/ai/prompts/builder.test.ts` - Prompt layering logic
- `src/lib/ai/client.test.ts` - Client factory, model routing
- `src/lib/ai/prompts/rules-qa.test.ts` - Prompt generation
- Mock OpenRouter responses

### Integration Tests (Playwright)
- Rules lookup E2E flow (⌘K → search → AI answer)
- Session summary generation flow
- Status strip updates during combat

### Manual Testing Checklist
- [ ] Free OpenRouter models work end-to-end
- [ ] All AI calls tracked in metrics dashboard
- [ ] ⌘K rules lookup from any page
- [ ] Status strip shows real-time HP updates
- [ ] Session summary generates valid JSON
- [ ] No errors in Sentry
- [ ] Costs tracked correctly

---

## Environment Setup

### Required API Keys

```bash
# .env.local additions:

# AI Provider (Development)
OPENROUTER_API_KEY="sk-or-v1-..."  # Get from https://openrouter.ai/keys
AI_MODE="dev"  # or "prod" for Anthropic

# AI Provider (Production - for later)
ANTHROPIC_API_KEY="sk-ant-..."
VOYAGE_API_KEY="voy-..."

# Optional: Site name for OpenRouter dashboard tracking
OPENROUTER_SITE_NAME="DM Copilot (Dev)"
OPENROUTER_SITE_URL="http://localhost:3000"
```

### OpenRouter Setup
1. Sign up at https://openrouter.ai
2. Get free credits or use free models (no credit card required for free tier)
3. Create API key
4. Set in `.env.local`

---

## Migration Path to Production

When ready to use paid Anthropic models:

1. Set `AI_MODE=prod` in environment
2. Add `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY`
3. No code changes needed (abstraction handles routing)
4. Prompt caching will work automatically (already structured in layers)
5. Cost tracking continues to work

---

## Success Metrics

### Functional
- ✅ All 7 critical features implemented
- ✅ Rules lookup returns relevant results
- ✅ AI responses are coherent (even with free models)
- ✅ No runtime errors in production
- ✅ All database migrations applied

### Performance
- Rules search: <500ms (text search)
- AI Q&A: <3s with free models (acceptable for dev)
- Status strip updates: <100ms (realtime)
- Session summary: <10s (background job)

### Cost (Development)
- $0/session with free OpenRouter models
- Cost tracking shows $0 or near-zero

### Quality
- Rules lookup accuracy: >70% relevant (manual spot checks)
- Session summary captures key events: >80% (DM validation)

---

## Risk Mitigation

### Risk: Free models produce poor quality outputs
**Mitigation:**
- Test with multiple free models (Gemini, Llama, Mistral)
- If quality insufficient, use cheapest paid models (~$0.10/session)
- Design prompts to be model-agnostic (clear instructions, examples)
- Plan to switch to Anthropic for production

### Risk: No semantic search without embeddings
**Mitigation:**
- PostgreSQL full-text search is surprisingly good for rules lookup
- Keyword-based search sufficient for MVP testing
- Add embeddings in Phase 1B if needed

### Risk: OpenRouter rate limits
**Mitigation:**
- Free tier has generous limits (usually 10+ req/min)
- Add retry logic with exponential backoff
- Track rate limit headers, log warnings

### Risk: Prompt caching doesn't work on OpenRouter
**Mitigation:**
- Structure prompts correctly now for future Anthropic migration
- Track "potential cache hits" in metrics
- Document savings once production caching enabled

---

## Timeline Estimate

**Full-time (2-3 weeks):**
- Week 1: AI infrastructure, SRD ingestion, rules lookup text search
- Week 2: Rules AI Q&A, prompt caching, status strip, testing
- Week 3: Post-session summary, polish, documentation

**Part-time (6-8 weeks):**
- Weeks 1-2: AI infrastructure + SRD ingestion
- Weeks 3-4: Rules lookup (text + AI)
- Weeks 5-6: Prompt caching + status strip
- Weeks 7-8: Post-session summary + testing

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create GitHub issues** for each priority section
3. **Set up OpenRouter account** and test API access
4. **Assign to implementation team** (or manager agent)
5. **Track progress** in project board

---

_End of Plan — Ready for Manager Agent Delegation_
