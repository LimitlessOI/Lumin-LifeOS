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
