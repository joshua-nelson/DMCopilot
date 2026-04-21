# Manager Agent Prompt: Complete Phase 1 AI Features

## Executive Summary

Implement the 7 critical missing Phase 1 features for DM Copilot using OpenRouter with free models for development/testing. This will take the project from 60% → 100% Phase 1 completion.

**Context:** DM Copilot is a D&D 5e Dungeon Master assistant web app (Next.js 15, TypeScript, Supabase, Clerk auth). The database schema, CRUD operations, and basic UI are complete. **All AI features are missing.** We need AI-powered rules lookup, session summaries, and supporting infrastructure.

**Key Constraint:** Use OpenRouter API with free models (Gemini Flash, Llama 3.2) for development to avoid costs during testing. Architecture must support easy migration to Anthropic (Claude) for production.

**Deliverable:** Fully functional Phase 1 MVP with all AI features working end-to-end.

---

## Your Task

Coordinate implementation of 7 features across multiple specialist agents. Each feature has dependencies; some can run in parallel, others must be sequential. Read `/root/DMCopilot/docs/phase1-completion-plan.md` for detailed specifications.

---

## Implementation Sequence

### Stage 1: AI Infrastructure Foundation (CRITICAL PATH)

**Must complete before any other AI features can start.**

**Specialist:** `backend-developer` or `ai-engineer`

**Tasks:**
1. Install dependencies: `openai` npm package (OpenRouter is OpenAI-compatible), `zod` for validation
2. Create AI client abstraction layer in `src/lib/ai/`:
   - `config.ts` - Environment-based model routing (dev=OpenRouter, prod=Anthropic)
   - `client.ts` - Factory that returns configured OpenAI client
   - `types.ts` - Shared types for AI calls
3. Update `.env.example` with OpenRouter keys
4. Update `src/lib/ai/trackAICall.ts` to support OpenRouter provider
5. Create simple test endpoint to verify AI calls work

**Inputs:**
- Existing `src/lib/ai/trackAICall.ts` (read to understand pattern)
- `package.json` (to add dependencies)
- `.env.example` (to document new env vars)

**Outputs:**
- Working AI client that can make calls to OpenRouter
- All calls tracked in `ai_calls` table
- Documented environment variables
- Test that proves end-to-end AI calls work

**Success Criteria:**
- Can call `getAIClient()` and make OpenRouter request
- Free models work: `google/gemini-flash-1.5-8b`
- Every call tracked with provider, model, tokens, cost
- Environment toggle `AI_MODE=dev|prod` works

**Dependencies:** None (start immediately)

**Estimated Duration:** 1-2 days

---

### Stage 2A: Prompt Caching Foundation (PARALLEL WITH 2B)

**Can start after Stage 1 completes.**

**Specialist:** `ai-engineer` or `prompt-engineer`

**Tasks:**
1. Create layered prompt builder utility in `src/lib/ai/prompts/`:
   - `builder.ts` - Core PromptBuilder class with 4 layers (static/campaign/session/volatile)
   - `layers.ts` - Type definitions for each layer
   - `cache.ts` - Cache control utilities (for future Anthropic migration)
2. Design layer structure following DesignDocument.md Section 10.2
3. Write unit tests for prompt builder
4. Document usage patterns

**Inputs:**
- DesignDocument.md (Section 10: "AI Model Routing & Caching")
- IMPLEMENTATION_TASKS.md (lines 165-168: Prompt Caching Foundation)

**Outputs:**
- `PromptBuilder` class that constructs layered prompts
- Works with both OpenRouter (no caching) and Anthropic (with cache_control)
- Unit tests covering edge cases
- Documentation with examples

**Success Criteria:**
- Can build prompts with 4 layers
- Generates correct format for OpenRouter and Anthropic APIs
- Tests pass (prompt ordering, cache breakpoints)
- TypeScript types enforce layer structure

**Dependencies:** Stage 1 (AI client)

**Estimated Duration:** 2-3 days

---

### Stage 2B: SRD 5.1 Ingestion Pipeline (PARALLEL WITH 2A)

**Can start after Stage 1 completes. Does NOT require prompt caching.**

**Specialist:** `data-engineer` or `backend-developer`

**Tasks:**
1. Download SRD 5.1 (CC-BY) from official WotC source or GitHub community repo
2. Create ingestion scripts in `scripts/ingest-srd/`:
   - `download.ts` - Fetch SRD files
   - `parse.ts` - Parse markdown/JSON into logical chunks (spells, monsters, rules, items)
   - `seed.ts` - Insert into `rules_chunks` table with tsvector
3. Verify `rules_chunks` table schema (should exist from migration 07_phase2_stubs.sql)
4. Add PostgreSQL full-text search indexes (GIN on tsvector)
5. Create search function in `supabase/sql/rules_search_function.sql`
6. Ensure CC-BY attribution in every chunk

**Inputs:**
- Official SRD 5.1: https://dnd.wizards.com/resources/systems-reference-document
- Or GitHub: https://github.com/BTMorton/dnd-5e-srd
- Existing migration: `supabase/sql/07_phase2_stubs.sql` (verify rules_chunks schema)

**Outputs:**
- ~500-1000 rule chunks in database with tsvector index
- Idempotent seed script (can re-run without duplicates)
- Search function for full-text queries
- Every chunk has source="SRD 5.1 (CC-BY)"

**Success Criteria:**
- Query `SELECT count(*) FROM rules_chunks` returns >500
- Full-text search works: `SELECT * FROM rules_chunks WHERE fts @@ websearch_to_tsquery('grapple')`
- Returns relevant results for common queries: "fireball", "advantage", "stealth"
- Attribution present in all records

**Dependencies:** Stage 1 (for future AI integration, but ingestion itself is independent)

**Estimated Duration:** 3-4 days

---

### Stage 3: Rules Lookup Feature (CRITICAL USER FEATURE)

**Requires Stage 1 (AI client), Stage 2A (prompt builder), Stage 2B (SRD data).**

**Specialist:** `fullstack-developer` or parallel: `frontend-developer` + `backend-developer`

**Tasks:**

**Backend:**
1. Create API routes in `src/app/api/rules/`:
   - `search/route.ts` - PostgreSQL full-text search (tsvector)
   - `qa/route.ts` - AI Q&A with top-k chunks
2. Build rules Q&A prompt in `src/lib/ai/prompts/rules-qa.ts`
3. Use layered prompt builder from Stage 2A
4. Track all AI calls with `trackAICall()`

**Frontend:**
1. Create command bar component in `src/components/command-bar/rules-lookup.tsx`
2. Keyboard shortcut: ⌘K / Ctrl+K (global)
3. Modal overlay with search input
4. Display search results (title, snippet, source)
5. "Ask AI" button for natural language Q&A
6. Citation card component to show full rule with attribution

**UI Flow:**
1. User presses ⌘K anywhere in app
2. Modal opens with search input
3. Type query → instant text search results (debounced 300ms)
4. Click "Ask AI" → sends query + top 3 chunks to LLM
5. Streaming response displays in modal
6. Citations link to source section

**Inputs:**
- SRD data in `rules_chunks` table (from Stage 2B)
- AI client (from Stage 1)
- Prompt builder (from Stage 2A)
- Existing shadcn/ui components (Dialog, Command, Input)

**Outputs:**
- ⌘K command bar accessible globally
- Text search returns results in <500ms
- AI Q&A works with free OpenRouter model
- Citations display SRD source
- All AI calls tracked in metrics

**Success Criteria:**
- Keyboard shortcut works from any page
- Search query "grapple" returns grappling rules
- AI Q&A answers "How does advantage work?" correctly
- Citations include "SRD 5.1 (CC-BY)"
- Metrics dashboard shows AI call costs

**Dependencies:** Stage 1, 2A, 2B (all must complete first)

**Estimated Duration:** 4-5 days

---

### Stage 4: Persistent Status Strip (PARALLEL WITH STAGE 5)

**Independent feature, can run in parallel with post-session summary.**

**Specialist:** `frontend-developer` or `react-specialist`

**Tasks:**
1. Create global status strip component in `src/components/session/`:
   - `persistent-status-strip.tsx` - Container for all PCs
   - `player-status-card.tsx` - Individual player card with HP bar, AC, conditions
   - `quick-sheet-popover.tsx` - Expanded sheet view on click
2. Integrate into session layout (`src/app/(app)/dashboard/campaigns/[campaignId]/sessions/[sessionId]/layout.tsx`)
3. Add Supabase Realtime subscription for character HP updates
4. Design responsive layout (desktop: horizontal bar, mobile: collapsible)
5. Add condition icons (poisoned, burning, etc.)

**UI Spec:**
```
┌───────────────────────────────────────────────────────┐
│ [Avatar] Thorin   ████████░░ 42/50 HP  AC 18  [💀]    │
│ [Avatar] Elara    ██████████ 32/32 HP  AC 14          │
│ [Avatar] Grimm    ████░░░░░░ 18/45 HP  AC 16  [🔥]    │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Color-coded HP bars (green >66%, yellow 33-66%, red <33%)
- Condition icons with tooltips
- Click player name → modal with full character sheet
- Sticky positioning (always visible)
- Realtime updates via Supabase

**Inputs:**
- Characters for current campaign (from database)
- Existing character schema (HP, AC, conditions in `characters` table)
- shadcn/ui components (Progress, Popover, Avatar)
- Supabase Realtime client

**Outputs:**
- Status strip visible on all session pages
- Real-time HP/AC updates
- Click interaction opens full sheet
- Mobile-responsive

**Success Criteria:**
- Strip shows all PCs for active session
- HP bar updates when character HP changes
- Clicking player opens sheet modal
- No layout shift when strip appears
- Works on mobile devices

**Dependencies:** None (uses existing character data)

**Estimated Duration:** 3-4 days

---

### Stage 5: Post-Session Summary (PARALLEL WITH STAGE 4)

**Requires Stage 1 (AI client) and Stage 2A (prompt builder).**

**Specialist:** `backend-developer` or `ai-engineer`

**Tasks:**
1. Create summary generation prompt in `src/lib/ai/prompts/session-summary.ts`
2. Design structured output schema (events, NPCs, loot, decisions, threads)
3. Create API endpoint: `src/app/api/sessions/[sessionId]/summary/route.ts`
4. Build UI components:
   - `src/components/session/summary-display.tsx` - Read-only view
   - `src/components/session/summary-editor.tsx` - Editable JSON
5. Integrate "Generate Summary" button into "End Session" flow
6. Add loading state with progress indicator
7. Save to `sessions.summary_json` field

**Prompt Strategy:**
- Input: `sessions.notes_md` + combat log (from `encounters` table)
- Output: Structured JSON via OpenAI function calling
- Use free model: `google/gemini-flash-1.5-8b` (good at structured output)

**JSON Schema:**
```typescript
{
  events: Array<{ type: 'combat'|'discovery'|'decision'|'npc_met', description: string }>,
  npcs_encountered: Array<{ name: string, role: string, relationship: string }>,
  loot_gained: Array<{ item: string, quantity: number }>,
  decisions_made: Array<{ choice: string, consequence?: string }>,
  unresolved_threads: Array<{ thread: string, last_mentioned: string }>,
  next_session_hooks: Array<string>
}
```

**Flow:**
1. DM clicks "End Session"
2. Dialog: "Generate summary?" checkbox
3. If yes → API call to `/api/sessions/[id]/summary`
4. Streaming generation (show progress)
5. Display editable summary
6. Save button → update `summary_json` field
7. Redirect to session detail page with summary visible

**Inputs:**
- Session notes from `sessions.notes_md`
- Combat encounters from `encounters` table
- AI client (from Stage 1)
- Prompt builder (from Stage 2A)

**Outputs:**
- Summary generation API endpoint
- Editable summary UI
- Saved to database
- Displayed on session detail page

**Success Criteria:**
- Click "End Session" → generates summary in <10s
- Summary JSON contains all required fields
- Can edit summary before saving
- Summary persists to database
- AI call tracked in metrics

**Dependencies:** Stage 1, 2A

**Estimated Duration:** 3-4 days

---

### Stage 6: Integration Testing & Polish

**Runs after all features complete.**

**Specialist:** `qa-expert` or `test-automator`

**Tasks:**
1. Write E2E tests in Playwright:
   - Rules lookup flow (⌘K → search → AI answer)
   - Session summary generation
   - Status strip real-time updates
2. Manual testing checklist:
   - All features work with free OpenRouter models
   - Metrics dashboard shows AI calls
   - No errors in Sentry
   - Mobile responsive
3. Performance testing:
   - Rules search <500ms
   - AI responses <5s (acceptable for free models)
   - Status strip updates <100ms
4. Cost validation:
   - All AI calls tracked
   - Free models show $0 cost
5. Documentation:
   - Update README with new features
   - Add setup guide for OpenRouter
   - Document environment variables

**Inputs:**
- All completed features from Stages 1-5
- Playwright config (exists: `playwright.config.ts`)
- Existing metrics dashboard

**Outputs:**
- E2E tests passing
- Manual test checklist completed
- Performance benchmarks documented
- Updated documentation

**Success Criteria:**
- All E2E tests pass
- No critical bugs in manual testing
- Performance within targets
- Documentation complete

**Dependencies:** All previous stages

**Estimated Duration:** 2-3 days

---

## Coordination Requirements

### Sequential Dependencies (MUST respect order):
1. **Stage 1** → All other stages (nothing can start without AI client)
2. **Stage 2A, 2B** → **Stage 3** (rules lookup needs both prompt builder and SRD data)
3. **Stage 2A** → **Stage 5** (summary needs prompt builder)
4. **All stages** → **Stage 6** (testing is last)

### Parallel Opportunities (CAN run simultaneously):
- **Stage 2A** (prompt caching) ∥ **Stage 2B** (SRD ingestion)
- **Stage 4** (status strip) ∥ **Stage 5** (summary)

### Critical Path (longest dependency chain):
**Stage 1 → Stage 2B → Stage 3** (~8-11 days)

If specialists are available in parallel:
- Specialist A: Stage 1 → Stage 2A → Stage 3 (backend) → Stage 5
- Specialist B: Stage 2B → Stage 3 (frontend)
- Specialist C: Stage 4 (can start anytime)
- Specialist D: Stage 6 (starts when all complete)

---

## Resource Allocation

### Recommended Specialist Assignments

**High Priority (Critical Path):**
1. **ai-engineer** or **backend-developer** → Stage 1, 2A, 5 (AI infrastructure)
2. **data-engineer** or **backend-developer** → Stage 2B (SRD ingestion)
3. **fullstack-developer** → Stage 3 (rules lookup - needs both FE and BE)

**Medium Priority (Parallel Work):**
4. **frontend-developer** or **react-specialist** → Stage 4 (status strip)

**Final Phase:**
5. **qa-expert** or **test-automator** → Stage 6 (testing)

**Optimal Team Size:** 2-3 specialists working in parallel
**Minimum Team Size:** 1 full-stack developer doing all stages sequentially

---

## Key Technical Constraints

### Must Follow Existing Patterns
- **Server actions:** Use existing pattern in `src/app/(app)/dashboard/campaigns/[campaignId]/*/actions.ts`
- **API routes:** Follow Next.js 15 App Router conventions
- **Database access:** Use `getSupabaseAdminClient()` for server-side, `createClient()` for client-side
- **Auth:** Wrap protected routes with Clerk auth checks (existing middleware)
- **Error handling:** Track all errors in Sentry
- **Analytics:** Track key events in PostHog

### Code Quality Requirements
- **TypeScript strict mode:** No `any` types
- **Error boundaries:** All AI calls must handle failures gracefully
- **Loading states:** All async operations need loading UI
- **Accessibility:** All interactive elements keyboard-navigable
- **Responsive:** Mobile-first design

### Testing Requirements
- **Unit tests:** For all AI utilities and prompt builders
- **Integration tests:** For API endpoints
- **E2E tests:** For critical user flows
- **Manual testing:** Before marking any stage complete

---

## Risk Management

### Risk: Free OpenRouter models produce poor quality
**Owner:** ai-engineer (Stage 1)
**Mitigation:**
- Test with multiple free models (Gemini Flash, Llama 3.2, Mistral)
- Design prompts to be model-agnostic (clear instructions, examples)
- Document quality issues, prepare to switch to cheap paid models if needed
- Architecture already supports switching to Anthropic for production

### Risk: SRD parsing fails or produces bad chunks
**Owner:** data-engineer (Stage 2B)
**Mitigation:**
- Manual review of first 20 chunks
- Test search with common queries (grapple, fireball, advantage)
- Idempotent script allows re-running with fixes
- Version the ingestion logic for reproducibility

### Risk: Command bar (⌘K) conflicts with browser shortcuts
**Owner:** frontend-developer (Stage 3)
**Mitigation:**
- Check for existing shortcuts in codebase
- Provide alternative trigger (slash command, menu item)
- Make shortcut configurable

### Risk: Realtime updates cause performance issues
**Owner:** frontend-developer (Stage 4)
**Mitigation:**
- Debounce updates (max 1 update per 100ms)
- Use Supabase Realtime filters (only subscribe to current campaign)
- Test with 6+ characters (typical party size)

---

## Deliverables Checklist

### Code
- [ ] All features implemented per specifications
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All tests passing

### Database
- [ ] SRD data seeded (~500+ chunks)
- [ ] All migrations applied
- [ ] Search indexes created

### Documentation
- [ ] README updated with new features
- [ ] OpenRouter setup guide
- [ ] Environment variables documented
- [ ] API endpoints documented

### Testing
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Manual testing checklist completed
- [ ] Performance benchmarks documented

### Deployment
- [ ] All environment variables in Vercel
- [ ] OpenRouter API key configured
- [ ] No Sentry errors in production
- [ ] Metrics dashboard shows AI calls

---

## Success Criteria (Final Acceptance)

### Functional Requirements
- ✅ AI client works with OpenRouter free models
- ✅ Rules lookup: ⌘K opens command bar from any page
- ✅ Rules lookup: Text search returns relevant SRD results
- ✅ Rules lookup: AI Q&A answers D&D rules questions
- ✅ Status strip: Shows all PCs with HP bars and conditions
- ✅ Status strip: Updates in real-time during combat
- ✅ Session summary: Generates structured JSON on session end
- ✅ Session summary: Editable before saving
- ✅ Prompt caching: Layered prompts ready for Anthropic migration
- ✅ All AI calls tracked in metrics dashboard

### Non-Functional Requirements
- ✅ No runtime errors in browser console
- ✅ No TypeScript compilation errors
- ✅ Mobile responsive (tested on 375px width)
- ✅ Keyboard accessible (⌘K, tab navigation)
- ✅ Loading states for all async operations
- ✅ Error handling for all AI calls (graceful degradation)

### Performance Targets
- Rules text search: <500ms
- AI Q&A response: <5s (with free models)
- Status strip update: <100ms
- Session summary generation: <10s

### Cost Targets (Development)
- $0/session with free OpenRouter models
- All costs tracked in `ai_calls` table
- Metrics dashboard shows per-feature cost breakdown

---

## Post-Implementation Tasks

After all stages complete:

1. **Code review:** Full codebase review focusing on AI integration patterns
2. **Security audit:** Ensure API keys never exposed to client, input validation on all AI endpoints
3. **Performance profiling:** Check for N+1 queries, unnecessary re-renders
4. **Documentation:** Update AGENTS.md with learnings from this phase
5. **Demo recording:** Record video demo of all features for stakeholders
6. **Migration plan:** Document steps to switch from OpenRouter to Anthropic for production

---

## Questions for Clarification

Before starting implementation, confirm:

1. **OpenRouter account:** Do we have API key, or should first step be account creation?
2. **SRD source preference:** Official WotC website or community GitHub repo?
3. **Free model selection:** Prefer Gemini Flash (faster) or Llama 3.2 (potentially better quality)?
4. **Testing scope:** Should E2E tests run in CI, or manual testing sufficient for Phase 1?
5. **Timeline flexibility:** Are we optimizing for speed (parallel specialists) or cost (sequential implementation)?

---

## Reference Documents

- **Detailed Plan:** `/root/DMCopilot/docs/phase1-completion-plan.md`
- **Architecture:** `/root/DMCopilot/DesignDocument.md`
- **Task List:** `/root/DMCopilot/IMPLEMENTATION_TASKS.md` (Phase 1: lines 63-169)
- **Code Review:** Search conversation history for "Phase 1 Implementation Review"
- **Existing Code Patterns:**
  - AI tracking: `/root/DMCopilot/src/lib/ai/trackAICall.ts`
  - Server actions: `/root/DMCopilot/src/app/(app)/dashboard/campaigns/actions.ts`
  - Supabase client: `/root/DMCopilot/src/lib/supabase/`
  - Database schema: `/root/DMCopilot/supabase/sql/`

---

## How to Use This Prompt

**For Manager Agent:**
1. Read this entire prompt
2. Review reference documents (especially phase1-completion-plan.md)
3. Assign stages to appropriate specialists in optimal order
4. Monitor dependencies (don't start Stage 3 until 2A+2B complete)
5. Aggregate results and run final integration testing
6. Report completion status with deliverables checklist

**For Specialist Agents:**
- You will receive individual stage assignments with inputs/outputs/success criteria
- Follow existing code patterns in the repository
- Track all AI calls with `trackAICall()`
- Write tests for your code
- Update documentation
- Mark your stage complete only when success criteria met

---

_Ready for Manager Agent execution. Estimated total duration: 2-3 weeks full-time, 6-8 weeks part-time._
