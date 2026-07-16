<!-- SYNOPSIS: Canonical product home — Memory System -->

# Memory System Product Home

**Formerly called:** Amendment 02 — MEMORY SYSTEM

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `memory-system` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/memory-system/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| P26-07-16 — Hardened `202311_memory_category_taxonomy_update.sql` and `202311_vector_embedding_update.sql` by no-opping placeholder `ALTER TABLE` blocks and adding `IF NOT EXISTS`/`DO $$` guards.|

---
**Status:** ACTIVE — CAPSULE MEMORY CANONICAL, LEGACY NARRATIVE PARTIALLY ARCHIVED
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-07-15 — BUILD_QUEUE step 11 (`reviews/phase7_pr_review.md`) skipped because `reviews/` is outside BuilderOS safe-scope; step 12 (`deploy/live_deploy_railway_pipeline.json`) skipped because Railway Hobby build queue is paused and `phase7-railway-probe` is not the active build runway. Prior: 2026-06-24 truth write gates.

---

## WHAT THIS IS
This amendment now governs the **capsule-memory layer only**:

- signal intake
- governed retrieval
- capsule correction
- provenance
- contradiction quarantine

It is not the umbrella SSOT for all memory anymore.

**Memory authority split:**
- Capsule memory: this amendment
- Evidence memory: `AMENDMENT_39_MEMORY_INTELLIGENCE`
- Self-repair memory: `services/self-repair-memory.js`
- Legacy CRUD/session memory: `routes/memory-routes.js` + `core/memory-system.js`

### Historical vs canonical scope

Older umbrella-memory language is preserved as historical context, but the canonical scope of this amendment is now capsule memory only.
Historian-style prediction/outcome calibration lives primarily in Amendment 39, not here.

---

## REVENUE ALIGNMENT
- Enables personalization → higher user retention → more MRR
- Conversation extraction feeds the idea-to-implementation pipeline
- Knowledge base uploads enable domain-specific AI responses (premium feature)

---

## TECHNICAL SPEC

### Files (Current)
| File | Purpose |
|------|---------|
| `data/memories.json` | Flat-file memory fallback (dev/local) — NOT canonical; Neon rows win |
| `routes/memory-routes.js` | Legacy memory CRUD API |
| `routes/memory-capsule-routes.js` | **Alpha capsule API** — signal, retrieve, health, capsule/:id, correct |
| `services/knowledge-context.js` | Knowledge base context injection |
| `services/memory-signal-intake.js` | Signal normalization + injection screening |
| `services/memory-candidate.js` | Epistemic fact candidate creation + dedup |
| `services/memory-capsule.js` | Capsule CRUD, trust update, CANONICAL guard |
| `services/memory-provenance.js` | Provenance chain builder; every retrieval creates retrieval_event |
| `services/memory-trust-bridge.js` | Evidence level floor checks for trust promotion |
| `services/memory-oil-bridge.js` | OIL trust-level → retrieval permission ceiling map |
| `services/memory-retrieval.js` | Lane-ceiling enforced retrieval with abstention counting |
| `services/memory-links.js` | Associative links (project/person/pattern/lesson) |
| `services/memory-contradiction.js` | Contradiction detection, record creation, resolution (quarantines loser) |
| `services/memory-zombie.js` | Zombie detection, quarantine, delay-quarantine |
| `services/memory-explanation.js` | Citation building and MEMORY_INFLUENCE_UNCITED enforcement |
| `services/memory-relationship.js` | Relationship capsule lane enforcement + founder confirmation |
| `services/memory-legacy-bridge.js` | Legacy row import (conversation_memory, knowledge_base, ssot_doc) |
| `services/memory-receipts.js` | Memory use receipt writer and lookup |
| `services/memory-working.js` | Working memory entries per session + promote-to-candidate |
| `services/memory-health.js` | Stale/quarantined/contested counts + citation rate |
| `services/memory-institutional.js` | Agent protocol violations + intent drift events |
| `config/memory-truth-classes.js` | 10 truth class definitions; all can_auto_promote_to_canonical=false |
| `services/conversation-store.js` | Session CRUD + `appendFounderExchange` → canonical founder memory |
| `services/founder-memory-store.js` | Append-only canonical store (`founder_memory_entries` + index jsonl) |
| `services/founder-memory-fanout.js` | One-write fan-out → governance / ideavault / continuity |
| `services/founder-memory-product-resolver.js` | Product→memory resolver + mandatory inject block |
| `services/product-ssot-context.js` | PRODUCT_HOME load wrapper with memory inject |
| `services/founder-memory-claim-gate.js` | Receipt citation gate (UNVERIFIED without receipt) |
| `routes/founder-memory-routes.js` | `/api/v1/founder-memory/*` |
| `Lumin-Memory/01_INDEX/founder_memory_index.jsonl` | Append-only canonical index |
| `db/migrations/20260708_founder_memory_canonical.sql` | `founder_memory_entries` table |

### DB Tables (Founder memory — canonical)
| Table | Purpose |
|-------|---------|
| `founder_memory_entries` | Append-only founder↔AI exchanges — receipt_id, session_id, product_ids[], classification |

### DB Tables (Alpha — Canonical)
| Table | Purpose |
|-------|---------|
| `epistemic_facts` | Evidence ladder spine — text, domain, level (0–6), decay_rate, review_by |
| `memory_capsules` | Capsule governance state — trust_level, retrieval_permission, truth_class, fact_id FK |
| `retrieval_events` | Every retrieval with why_retrieved, allowed_use, retrieval_lane |
| `debate_records` | Contradiction/debate history and residue risk |
| `contradiction_records` | Explicit contradictions between capsule pairs (capsule_id_a, capsule_id_b) |
| `working_memory_entries` | Active context used per session; promote-to-candidate eligible |
| `memory_use_receipts` | Cite-or-ignore enforcement; 6 valid use_types |
| `memory_import_receipts` | Audit trail for legacy row imports |

### Key Endpoints (Canonical Capsule Surface)
- `POST /api/v1/memory/capsules/signal` — intake a new signal; creates fact + capsule
- `POST /api/v1/memory/capsules/retrieve` — lane-governed retrieval with provenance
- `GET /api/v1/memory/capsules/health` — stale/quarantined/contested/citation stats
- `GET /api/v1/memory/capsules/capsule/:id` — read a single capsule by capsule_id
- `POST /api/v1/memory/capsules/correct` — update trust level (founder-initiated)

### Archived Legacy Context
The following older memory surfaces are preserved for historical reference only and are no longer canonical under this amendment:
- `conversation_memory`
- `knowledge_base_files`
- `system_source_of_truth`
- legacy `/api/memories*` CRUD routes

---

## CURRENT STATE
- **KNOW:** capsule memory is canonical for governed product-memory flows
- **KNOW:** Amendment 39 evidence memory is a separate canonical system
- **KNOW:** legacy CRUD memory still exists and is preserved under legacy naming
- **DON'T KNOW:** whether legacy CRUD memory still serves an active product need or only migration/history

### Mission-linked retrieval direction

Capsule retrieval should increasingly attach to mission context where available:
- why this capsule was retrieved
- which mission or lane it served
- whether it influenced an action
- whether later outcomes confirmed or weakened that influence

That direction is canonical.
Full runtime mission-state attachment is not yet universal.

---

## CLEANUP NOTE
Legacy CRUD/session memory is no longer described here as canonical architecture. It should remain preserved for migration/history, but it must not influence BuilderOS proof maturity or capsule-memory route ownership.

---

## NON-NEGOTIABLES (this project)
- Never store API keys, passwords, or sensitive credentials in memory
- User can request deletion of their memories (data sovereignty — North Star Article 2.1)
- Memory writes are async — never block the main request
- Max memory size per user: define a cap to prevent unbounded DB growth

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 72/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] All segments have specific-enough descriptions for a headless AI
- [ ] DB schema documented — tables exist but vector embedding column not yet defined
- [x] API surface defined — four endpoints documented
- [ ] Memory TTL policy and archive logic not yet specified to implementation level
- [ ] Memory category taxonomy (`user_preference`, `decision`, `context`, `fact`) not yet reflected in schema

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Mem.ai | Clean UX, semantic search, collaborative | No code/dev integration, no multi-model council, no action layer | We are not a notes tool — memory powers autonomous action, not just recall |
| Notion AI | Trusted brand, rich docs, block-level AI | Memory is per-document, not cross-context; no agent loop | Our memories are active context injected into every AI call, not passive pages |
| LangChain Memory | Developer-grade, multiple backend options | No product layer — raw library, no UI, no hosted persistence | We ship memory as part of a complete operating system, not a dev dependency |
| LifeOS (internal) | Cross-domain memory spanning all features | Full-text only today, no vector embeddings live yet | When embeddings land, we will be the only system that remembers real estate, wellness, personal, and business context simultaneously |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| OpenAI ships persistent memory natively to ChatGPT for all users | HIGH (already in limited rollout) | Medium — reduces differentiation for basic recall | Monitor: our edge is action-oriented memory inside an integrated OS, not recall alone |
| pgvector performance degrades at scale (>1M rows) | Medium | Medium — search latency increases | Mitigate: cap per-user memory at 10,000 rows; archive + summarize older memories quarterly |
| User sensitive data leaked in memory writes | Low | HIGH — trust destruction, legal exposure | Mitigate: memory content policy at write time; PII detection before storage; gitignore memories.json |
| Model context windows hit 1M tokens (Gemini 1.5 already there) | Medium | Medium — "just stuff everything in context" becomes viable for competitors | Monitor: our edge shifts to curation and cross-session learning, not just retrieval |

### Gate 4 — Adaptability Strategy
Memory storage is isolated in `services/memory-service.js` (planned) and the DB tables. If a competitor introduces graph-based memory (e.g., linking memories as nodes), we can add a `memory_links` table and a graph traversal service without touching any route or the AI council. If embeddings need to switch from pgvector to Pinecone, only the retrieval function in the memory service changes. Score: 72/100 — model-agnostic and service-isolated once extraction from server.js completes; current blocker is the inline code in server.js.

### Gate 5 — How We Beat Them
While competitors store memories as passive retrievable notes, LifeOS memory is active infrastructure — every AI council call receives automatically ranked context from all memory categories, so the system gives better answers without the user ever having to "search" their own history.

---

## Change Receipts

| 2026-07-16 | **Restore `scripts/memory-pressure-test.mjs` and `db/memory-auto-apply.sql` from corrupt JSON-patch blobs.** Both files had been overwritten with raw `old_string`/`new_string` JSON-patch arrays, breaking `node --check`, the migration runner, and `FILE_SYNOPSIS_LAW`. Reconstructed them as the intended ESM test module and idempotent SQL migration, added their `@ssot`/`SYNOPSIS` headers, and re-synced the file-synopsis index. | These files were not guarded by the factory's syntax gate and degraded `lifeos:bp-priority:verify` / migration preflight. | `node --check scripts/memory-pressure-test.mjs`, `npm run lifeos:bp-priority:verify` PASS, `npm run lifeos:file-synopsis:enforce && npm run lifeos:file-synopsis:index` |
| 2026-07-10 | **GAP-FILL T05 direct-agent inject** — front-door `runChairDirectAgent` skipped `loadChairMemoryContext`; counsel path had inject but conversational turns use direct agent. | Live Chair: memory_context null in SYSTEM_FACTS. | ✅ | tip + Chair re-probe |
| 2026-07-10 | **Chair every-turn founder memory inject** — `loadLuminMemory` in command-control calls `injectProductMemoryIntoContext` (product inferred from message); chair orchestrator passes `messageText` into `loadChairMemoryContext`. Closes scorecard Memory gap (write-live / read-missing on normal turns). | Path-to-10 T05 — memory LIVE every Chair turn | `node --test tests/founder-memory.test.js` |

| 2026-07-08 | **Founder↔AI canonical memory v1** — `founder_memory_entries` migration; `founder-memory-store` + fan-out to governance/ideavault/CONTINUITY_LOG; product auto-inject in chair blueprint intake + `loadProductHomeWithFounderMemory`; receipt-linked claim gate; routes at `/api/v1/founder-memory`; SENTRY proof PASS (`products/receipts/FOUNDER_MEMORY_V1_SENTRY.json`). | One durable memory group per product — conversations in context, not links | `node builderos-reboot/scripts/founder-memory-sentry-proof.mjs` PASS; `node --test tests/founder-memory.test.js` 7/7 |

| 2026-06-24 | **`core/memory-system.js`**, **`services/memory-write-gate.js`**, **`services/conversation-store.js`**, **`startup/memory.js`** — AI prose gated on write; assistant conversation rows scrubbed; theater blocked | Point B DNA / truth stack: no falsehoods in memory corpus | ✅ truth-gap tests | deploy |
| 2026-05-24 | **`routes/memory-routes.js`** — legacy memory router no longer applies `requireKey` to non-`/memories` paths under `/api` (unblocked LifeOS public login). | Auth regression: all `/api/v1/lifeos/auth/*` returned 401 without command key. | GAP-FILL | pending deploy |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| Date | What Changed | Why | Verified |
|---|---|---|---|
| 2026-06-01 | Constitutional refactor alignment only. Preserved capsule-memory scope as canonical; explicitly marked historian-style prediction/outcome calibration as Amendment 39 authority; added mission-linked retrieval direction without claiming full runtime mission-state enforcement exists yet. | Keep memory authority split honest while aligning to mission-first governance. | ✅ |
| 2026-05-21 | Memory Capsule Alpha OIL Governance Pass: 17 services/route files written (BT-001–BT-021) + 11 blockers repaired. Files: memory-signal-intake, memory-candidate, memory-capsule, memory-provenance, memory-trust-bridge, memory-oil-bridge, memory-retrieval, memory-links, memory-contradiction, memory-zombie, memory-explanation, memory-relationship, memory-legacy-bridge, memory-receipts, memory-working, memory-health, memory-institutional, routes/memory-capsule-routes. 2 DB migrations (20260521_memory_capsule_core + receipts). | Alpha build + governance pass for MC-F01–F21 per BUILD_QUEUE.json. GAP-FILL: council output had logic inversions, stray fences, truncated files. | `node --check` PASS all 17 files |
| 2026-05-28 | **Memory namespace audit Phase 2:** `routes/memory-routes.js` — added `LEGACY_META` constant (`memory_authority: 'LEGACY_COMPAT'`, `canonical_replacement: '/api/v1/memory/evidence or /api/v1/memory/capsules'`, `do_not_use_for_builderos_proof: true`) spread into all 5 legacy route responses. Routes mounted at `/api/memories/*` and `/api/v1/memory/legacy/*` now self-report their authority classification to callers. | Close ambiguity: callers must not use legacy CRUD memory routes for BuilderOS proof. No routes deleted. | ✅ `node --check routes/memory-routes.js` |
| 2026-05-28 | Memory authority cleanup: Amendment 02 narrowed to capsule-memory scope only; canonical capsule routes moved to `/api/v1/memory/capsules/*`; legacy CRUD/session-memory narrative archived from canonical sections. | Remove overlap with Amendment 39 evidence memory and legacy CRUD memory while preserving historical receipts. | ✅ |
| 2026-05-21 | AMENDMENT_02_MEMORY_SYSTEM.md: Files table and DB tables updated to reflect Memory Capsule Alpha surface. | SSOT atomic update required by pre-commit hook. | ✅ |
| 2026-05-21 | Fixed import-path bugs in 3 files: (1) memory-oil-bridge.js — removed dead `Pool`+`LEVEL` imports, fixed `WHERE id` → `WHERE capsule_id`, fixed enforceRetrievalCeiling to use indexOf comparison, fixed TRUSTED_FOR_CONTEXT ceiling from `decision_support` to `action_authority`; (2) memory-trust-bridge.js — removed dead pool import (db/pool.js DNE), fixed LEVEL import path to `./memory-intelligence-service.js`, fixed TRUST_MAP ceiling values (was using undefined LEVEL.BLOCKED etc., now string permission values), fixed WHERE clauses, fixed factLevel.rows[0].level, fixed INSERT to memory_use_receipts (was capsule_receipts), CANONICAL guard now string-checks; (3) memory-explanation.js — removed dead `LEVEL` import with wrong `../` path. | These broken imports prevented Step 5 pressure test from loading. | `node --check` PASS all 3; pressure test 18/20 PASS 2 PARTIAL |
| 2026-05-21 | MC-BENCH Pressure Test (Step 5): 18/20 PASS, 2 PARTIAL, 0 FAIL. VERDICT: ALPHA_PASS_WITH_GAPS. Gaps: MC-BENCH-02 (REALITY_ANCHOR_MEMORY_MISMATCH not implemented — MC-F22 gap) + MC-BENCH-04 (intermediate promotion blocking RECEIPT_BACKED→TRUSTED_FOR_CONTEXT needs explicit receipt check in updateCapsuleTrust). | Step 5 of Memory Capsule Alpha 5-step pipeline. | `node scripts/memory-pressure-test.mjs --dry-run` exit 0 |
| 2026-05-21 | Gap-closure patch for Memory Capsule Alpha: `services/memory-capsule.js` now implements `validateRealityAnchor(capsuleId, liveValue, pool)` with quarantine + `halt_receipt` on mismatch and adds explicit `audit_completion_receipt` gate for `RECEIPT_BACKED -> TRUSTED_FOR_CONTEXT` in `updateCapsuleTrust`. `scripts/memory-pressure-test.mjs` now executes both checks in dry-run mode instead of marking them partial by comment. | Close MC-BENCH-02 and MC-BENCH-04 without redesigning Alpha. | `node --check services/memory-capsule.js`; `node --check scripts/memory-pressure-test.mjs`; `node scripts/memory-pressure-test.mjs --dry-run` => 20/20 PASS, 0 PARTIAL, 0 FAIL |
| 2026-05-21 | routes/memory-capsule-routes.js: fixed `import authMiddleware from '../middleware/authMiddleware.js'` → `../middleware/auth.js`. authMiddleware.js is an empty stub (no exports); auth.js has the proper default export (passthrough next()). This was the Railway boot-crash blocker preventing the server from starting on the f962de86 deploy. | Railway deploy FAILED with `SyntaxError: does not provide an export named 'default'` on server boot. Smallest bounded fix. | `node --check routes/memory-capsule-routes.js` PASS |
| 2026-05-21 | NEW migration 20260523_memory_capsule_constraint_repair.sql — drops and recreates memory_capsules_source_type_check to include user_input; adds working_memory_entries.entry_content and promoted_to_candidate columns; guards epistemic_facts.review_by. Root cause: 20260521 migration ran initially without user_input; f962de86 patched the CREATE TABLE IF NOT EXISTS but node-pg-migrate won't re-run already-applied migrations, so the constraint was never updated on Neon. | POST /api/v1/memory/signal returned 500 with PG error 23514 (check constraint violation on source_type=user_input). | Deployed; Railway SHA 4ae51f49 PASS |
| 2026-05-21 | Live MC-BENCH pressure test via Railway/Neon: 20/20 PASS, 0 PARTIAL, 0 FAIL. VERDICT: ALPHA_PASS (LIVE). All 5 endpoint probes verified: /health (200), /signal (capsule created), /retrieve (provenance chain returned), /capsule/:id (capsule read), /correct (trust mutation path). | Final live proof for OIL certification. | `node scripts/memory-pressure-test.mjs --live` ALPHA_PASS |
| 2026-07-15 | **BuilderOS safe-scope cleanup:** skipped `docs/products/memory-system/BUILD_QUEUE.json` step 11 (`reviews/phase7_pr_review.md`) — outside BuilderOS write paths; skipped step 12 (`deploy/live_deploy_railway_pipeline.json`) — Railway Hobby paused and `phase7-railway-probe` not the active build runway (`builderos-autonomous` is the runway). | Stop token-wasting retries on unreachable artifacts while the autonomous factory runs. | `lifeos:bp-priority:verify` PASS (committed to `builderos-autonomous` queue) |

## Agent Handoff Notes

**Current state (2026-05-21): OIL CERTIFIED — ALPHA_PASS (LIVE).**

All 5 pipeline steps complete. Live Railway/Neon proof achieved. Runtime SHA: `4ae51f49`.

- Steps 1–3: Governing docs + BUILD_QUEUE.json + council build MC-F01–F21 ✅
- Step 4: OIL Governance Pass — 11 blockers resolved ✅
- Step 5: Live pressure test — 20/20 PASS against Railway/Neon ✅

All 5 capsule endpoints verified live on Railway (health, signal, retrieve, capsule/:id, correct).

**Deploy cutover fixes required (documented for next agents):**
1. `authMiddleware.js` → `auth.js` import (empty stub had no default export → Railway boot crash)
2. `20260523_memory_capsule_constraint_repair.sql` (source_type CHECK missing user_input → PG 23514)

**Next:** This branch (`phase7-railway-probe`) is ready for final PR merge to main — the fast-forward to main used for Railway deploy testing does NOT constitute a reviewed merge. A formal review and PR note is recommended before considering this "merged."

**Next priority:** deploy `phase7-railway-probe` branch to Railway for live mode of `scripts/memory-pressure-test.mjs` and verify the same 20/20 result against real Neon state and mounted routes.

**Open BLUEPRINT.md §42 questions still needing founder confirmation:**
- Q2: Capsule ID format — UUID v4 is default; schema migration not yet run
- AMENDMENT_02_MIGRATION_RUNBOOK.md OPEN_QUESTION: recency threshold for conversation_memory migration (default 90 days, needs confirmation)

---

## Change Receipts

| 2026-07-16 | **Harden placeholder memory migrations.** `db/migrations/202311_memory_category_taxonomy_update.sql` and `db/migrations/202311_vector_embedding_update.sql` now use safe `DO $$` no-ops and `IF NOT EXISTS` guards instead of targeting placeholder tables (`existing_table_name`, `your_actual_table_name`), removing `ALTER_ADD_COLUMN_MISSING_IF_NOT_EXISTS` preflight warnings. | Placeholder table names would fail at runtime and the missing `IF NOT EXISTS` produced preflight warnings. | `db/migrations/202311_memory_category_taxonomy_update.sql`, `db/migrations/202311_vector_embedding_update.sql` | `node scripts/verify-migration-preflight.mjs` warnings=0; `npm run lifeos:bp-priority:verify` PASS |
