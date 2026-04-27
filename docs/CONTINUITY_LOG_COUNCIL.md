# Continuity Log — Council / LCL / Builder Lane

> Log **only** sessions that touch `services/council-service.js`, `config/codebook*.js`, `services/prompt-translator.js`, `services/lcl-monitor.js`, `routes/lifeos-council-builder-routes.js`, or council-related migrations.

**Most recent first.**

---

## [BUILD] Update 2026-04-26 #2 — Runtime authority + future-back consensus enforcement

### Files changed
- `routes/lifeos-council-builder-routes.js` — builder dispatch now consults Memory Intelligence routing, fails closed when no authorized model is allowed, and records protocol violations on unverifiable output.
- `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-council-run.js`, `prompts/lifeos-gate-change-proposal.md` — gate-change debate now requires future-back analysis, filters blocked models, and persists debate artifacts into memory.
- `config/task-model-routing.js` — static routing is now preference only; candidate-model ordering exported for runtime authority filtering.
- `services/memory-intelligence-service.js`, `routes/memory-intelligence-routes.js`, `db/migrations/20260426_memory_intelligence_hardening.sql`, `db/migrations/20260426_memory_protocol_enforcement.sql` — protocol violations, task authority, routing recommendation, debate future-lookback.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/SSOT_COMPANION.md`, `docs/AGENT_RULES.compact.md`, `scripts/generate-agent-rules.mjs` — council law, anti-corner-cutting rule, and compact cold-start packet updated; generator now keeps the rule durable.

### State after this session
- Builder, gate-change, and Lumin plan/draft lanes can now reject blocked models at runtime instead of blindly trusting static routing.
- Future-back is part of the required council protocol and is persisted with debate records.
- Compact agent rules are regenerated from script and still satisfy the token-budget law; manual edits to `AGENT_RULES.compact.md` are no longer the only source.

### Next agent (council lane): start here
1. Wire council/builder success + failure receipts into `fact_evidence` automatically so routing and authority are fed by real verifier outcomes, not just manual writes.
2. Add targeted tests for `recordProtocolViolation()` + routing recommendation selection.
3. Extend runtime authority checks to any remaining council entrypoints that still call providers directly.

---

## [BUILD] Update 2026-04-19 #1 — LCL + builder surface (migrated from main log #5)

### Files changed (canonical list — see also main `CONTINUITY_LOG.md` history)
- `config/codebook-v1.js`, `services/prompt-translator.js`, `services/lcl-monitor.js`, `db/migrations/20260419_lcl_quality_log.sql`, `services/council-service.js`, `routes/lifeos-council-builder-routes.js`, `startup/register-runtime-routes.js`, `server.js`, `docs/projects/AMENDMENT_01_AI_COUNCIL.md`

### State after that session
- LCL Layer 1.5 live on `callCouncilMember`; drift monitor with per-(member, taskType) rollback.
- `GET /api/v1/lifeos/builder/lcl-stats` live.

### Next agent (council lane): start here
1. Confirm `db/migrations/20260419_lcl_quality_log.sql` applied on Neon (auto on deploy).
2. Fix gaps documented in `AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` → Approved backlog (Ollama `inspect`, static codebook import — may already be shipped in a later commit).
3. Conflict interrupt + Lumin reactions remain **LifeOS lane** (`CONTINUITY_LOG_LIFEOS.md` + `prompts/lifeos-conflict.md`).

---
