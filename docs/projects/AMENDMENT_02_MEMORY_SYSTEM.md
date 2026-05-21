# AMENDMENT 02 — Memory System
**Status:** LIVE
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-05-21 — Step 5 complete. ALPHA_PASS_WITH_GAPS (18/20). Import bugs fixed in oil-bridge, trust-bridge, explanation, candidate, legacy-bridge, links (uuid→randomUUID; uuid pkg not installed).

---

## WHAT THIS IS
The memory system stores conversation context, user preferences, and system knowledge across sessions. It enables the AI council to remember what was discussed, what decisions were made, and what the user cares about — turning a stateless API into a persistent intelligent assistant.

**Mission:** Give the system persistent memory so it improves over time and never asks the same question twice.

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

### DB Tables (Alpha — Canonical)
| Table | Purpose |
|-------|---------|
| `epistemic_facts` | Evidence ladder spine — statement, domain, level (0–6), decay_rate, review_by |
| `memory_capsules` | Capsule governance state — trust_level, retrieval_permission, truth_class, fact_id FK |
| `retrieval_events` | Every retrieval with why_retrieved, allowed_use, retrieval_lane |
| `debate_records` | Contradiction/debate history and residue risk |
| `contradiction_records` | Explicit contradictions between capsule pairs (capsule_id_a, capsule_id_b) |
| `working_memory_entries` | Active context used per session; promote-to-candidate eligible |
| `memory_use_receipts` | Cite-or-ignore enforcement; 6 valid use_types |
| `memory_import_receipts` | Audit trail for legacy row imports |

### Key Endpoints (Alpha)
- `POST /api/v1/memory/signal` — intake a new signal; creates fact + capsule
- `POST /api/v1/memory/retrieve` — lane-governed retrieval with provenance
- `GET /api/v1/memory/health` — stale/quarantined/contested/citation stats
- `GET /api/v1/memory/capsule/:id` — read a single capsule by capsule_id
- `POST /api/v1/memory/correct` — update trust level (founder-initiated)

### DB Tables
| Table | Purpose |
|-------|---------|
| `conversation_memory` | Stores AI conversation context (orchestrator msg + AI response) |
| `knowledge_base_files` | Uploaded files for domain context |
| `system_source_of_truth` | DB-backed SSOT documents |

### Key Endpoints (Current)
- `POST /api/v1/memory/store` — save a memory
- `GET /api/v1/memory/search` — semantic search memories
- `GET /api/v1/conversation/history` — get conversation history
- `POST /api/v1/knowledge/upload` — upload a knowledge file

---

## CURRENT STATE
- **KNOW:** `conversation_memory` table exists and is written to on each AI call
- **KNOW:** `data/memories.json` is committed to git — this is a security concern if it ever contains sensitive data
- **KNOW:** `routes/memory-routes.js` exists and is separate from server.js
- **THINK:** Semantic search may not be properly indexed (no vector embeddings visible, likely full-text only)
- **DON'T KNOW:** Whether conversation history has a retention/cleanup policy

---

## REFACTOR PLAN
1. Move all inline memory functions from server.js → `services/memory-service.js`
2. Add vector embeddings for semantic search (pgvector on Neon, or Pinecone)
3. Add memory TTL — stale memories auto-archived after 90 days
4. Add memory categories: `user_preference`, `decision`, `context`, `fact`
5. Ensure `data/memories.json` is in `.gitignore` if it may contain PII

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

| Date | What Changed | Why | Verified |
|---|---|---|---|
| 2026-05-21 | Memory Capsule Alpha OIL Governance Pass: 17 services/route files written (BT-001–BT-021) + 11 blockers repaired. Files: memory-signal-intake, memory-candidate, memory-capsule, memory-provenance, memory-trust-bridge, memory-oil-bridge, memory-retrieval, memory-links, memory-contradiction, memory-zombie, memory-explanation, memory-relationship, memory-legacy-bridge, memory-receipts, memory-working, memory-health, memory-institutional, routes/memory-capsule-routes. 2 DB migrations (20260521_memory_capsule_core + receipts). | Alpha build + governance pass for MC-F01–F21 per BUILD_QUEUE.json. GAP-FILL: council output had logic inversions, stray fences, truncated files. | `node --check` PASS all 17 files |
| 2026-05-21 | AMENDMENT_02_MEMORY_SYSTEM.md: Files table and DB tables updated to reflect Memory Capsule Alpha surface. | SSOT atomic update required by pre-commit hook. | ✅ |
| 2026-05-21 | Fixed import-path bugs in 3 files: (1) memory-oil-bridge.js — removed dead `Pool`+`LEVEL` imports, fixed `WHERE id` → `WHERE capsule_id`, fixed enforceRetrievalCeiling to use indexOf comparison, fixed TRUSTED_FOR_CONTEXT ceiling from `decision_support` to `action_authority`; (2) memory-trust-bridge.js — removed dead pool import (db/pool.js DNE), fixed LEVEL import path to `./memory-intelligence-service.js`, fixed TRUST_MAP ceiling values (was using undefined LEVEL.BLOCKED etc., now string permission values), fixed WHERE clauses, fixed factLevel.rows[0].level, fixed INSERT to memory_use_receipts (was capsule_receipts), CANONICAL guard now string-checks; (3) memory-explanation.js — removed dead `LEVEL` import with wrong `../` path. | These broken imports prevented Step 5 pressure test from loading. | `node --check` PASS all 3; pressure test 18/20 PASS 2 PARTIAL |
| 2026-05-21 | MC-BENCH Pressure Test (Step 5): 18/20 PASS, 2 PARTIAL, 0 FAIL. VERDICT: ALPHA_PASS_WITH_GAPS. Gaps: MC-BENCH-02 (REALITY_ANCHOR_MEMORY_MISMATCH not implemented — MC-F22 gap) + MC-BENCH-04 (intermediate promotion blocking RECEIPT_BACKED→TRUSTED_FOR_CONTEXT needs explicit receipt check in updateCapsuleTrust). | Step 5 of Memory Capsule Alpha 5-step pipeline. | `node scripts/memory-pressure-test.mjs --dry-run` exit 0 |

## Agent Handoff Notes

**Current state (2026-05-21):** All 5 steps of Memory Capsule Alpha pipeline complete.
- Steps 1–3: 6 governing docs + BUILD_QUEUE.json + council build of MC-F01–F21 ✅
- Step 4: OIL Governance Pass — 11 blockers resolved ✅
- Step 5: Pressure test — 18/20 PASS, 2 PARTIAL ✅ (ALPHA_PASS_WITH_GAPS)

Routes mounted at `/api/v1/memory` in register-runtime-routes.js. All 17+ service/route files pass `node --check`.

**Two known open gaps (not blockers — tracked for MC-F22):**
1. `MC-BENCH-02 / MC-F22`: REALITY_ANCHOR_MEMORY_MISMATCH halt code not implemented. When a capsule's claim conflicts with a real-time system reading, no halt fires. Requires a new `validateRealityAnchor(capsuleId, liveValue, pool)` function in memory-capsule.js and the halt code in the catalog.
2. `MC-BENCH-04`: `updateCapsuleTrust` in memory-capsule.js blocks CANONICAL but does not require an `audit_completion_receipt` for the RECEIPT_BACKED → TRUSTED_FOR_CONTEXT step. Add: check `memory_use_receipts` for `receipt_type = 'audit_completion_receipt'` before allowing that promotion.

**Next priority:** Either (a) deploy `phase7-railway-probe` branch to Railway for live test (live mode of pressure test), or (b) address MC-F22 gap and MC-BENCH-04 gap in a follow-on session.

**Open BLUEPRINT.md §42 questions still needing founder confirmation:**
- Q2: Capsule ID format — UUID v4 is default; schema migration not yet run
- AMENDMENT_02_MIGRATION_RUNBOOK.md OPEN_QUESTION: recency threshold for conversation_memory migration (default 90 days, needs confirmation)
