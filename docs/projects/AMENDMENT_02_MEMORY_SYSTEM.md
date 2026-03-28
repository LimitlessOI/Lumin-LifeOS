# AMENDMENT 02 — Memory System
**Status:** LIVE
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

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
| `data/memories.json` | Flat-file memory fallback (dev/local) |
| `routes/memory-routes.js` | Memory CRUD API |
| `services/knowledge-context.js` | Knowledge base context injection |
| `server.js` (lines 4203–4252, 10309–10417) | Memory store/retrieve + conversation history — NEEDS EXTRACTION |

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
