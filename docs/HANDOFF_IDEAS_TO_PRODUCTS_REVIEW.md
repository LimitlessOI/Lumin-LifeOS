# Handoff: Ideas-to-Products Review & Suggestions

**Purpose:** Another model (or human) should review the codebase and docs, then provide **20 concrete suggestions** to improve how the system develops ideas into products, plus any **missing tools** needed.  
**Audience:** Next reviewer (AI or human).  
**Date:** 2026-03-12.

---

## 1. SSOT Hierarchy (Read First)

1. **`docs/SSOT_NORTH_STAR.md`** — Constitution: mission, principles, change control, self-programming rules. **Wins all conflicts.**
2. **`docs/SSOT_COMPANION.md`** — Operations, enforcement, technical specs.
3. **`docs/SOURCE_OF_TRUTH.md`** — Outcome targets, philosophy, “build our ideas” context.
4. **`docs/TRUE_VISION.md`** — BE → DO → HAVE, phases, revenue targets.
5. **`docs/architecture/target.md`** — Target: local-first, modular AI Counsel OS; idea generation; folder structure.

**Rule:** If anything conflicts with North Star or Companion, SSOT wins. No operational steps without evidence or user confirmation (Evidence Rule). Label uncertainty: KNOW / THINK / GUESS / DON'T KNOW.

---

## 2. What Was Recently Done (Server Modularization)

- **Council** → `services/council-service.js` (helpers + knowledge-context injection).
- **Execution queue** → `services/execution-queue.js` (FSAR gating, idea_implementation, build tasks).
- **Sandbox / Snapshot** → `services/sandbox-service.js`, `services/snapshot-service.js`.
- **Self-programming** → `services/self-programming.js` + `modules/system/self-programming-module.js` (POST `/api/v1/system/self-program`).
- **Autonomy loops** → `services/autonomy-scheduler.js` (CRM, log monitor, pipeline, daily ideas, AI rotation, Stripe, vacation, BoldTrail, TCO).
- **Dead code** → Inline `ExecutionQueue` class and duplicate self-program/vacation/BoldTrail blocks removed from `server.js`.

`server.js` is still ~13k lines and ~100 routes; it wires the above and holds most route registration and startup.

---

## 3. Key Paths for “Ideas → Products”

| Area | Paths |
|------|--------|
| Ideas generation | `services/idea-engine.js`, `core/auto-queue-manager.js`, `core/comprehensive-idea-tracker.js`, `core/enhanced-idea-generator.js` |
| Idea → implementation | `core/idea-to-implementation-pipeline.js` (concept → design → plan → self-programming → verify) |
| Execution & gating | `services/execution-queue.js`, `audit/fsar/fsar_runner.js`, `audit/gating/execution_gate.js` |
| Council / AI | `services/council-service.js`, `services/knowledge-context.js` |
| Self-programming | `services/self-programming.js`, `modules/system/self-programming-module.js` |
| Data/storage | `data/ideas/`, `knowledge/`, DB via `core/database.js` / `services/db.js` |
| Docs (SSOT, vision) | `docs/SSOT_NORTH_STAR.md`, `docs/SSOT_COMPANION.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/TRUE_VISION.md`, `docs/architecture/target.md` |

---

## 4. Requested Output From Reviewer

### A. 20 suggestions to make the system better at developing ideas into products

Focus on:

- Improving **idea generation → prioritization → implementation → verification**.
- Aligning with **SSOT / North Star** (Zero-Degree Protocol, Evidence Rule, fail-closed).
- **Missing or weak steps** in the pipeline (e.g. validation, rollback, product framing).
- **Observability, safety, and product quality** (e.g. idea provenance, outcome tracking, guardrails).
- **Docs and single source of truth** (e.g. idea schema, product outcome targets, runbooks).

Each suggestion should be **concrete and actionable** (what to add/change, where, and why it helps ideas → products). Number them 1–20.

### B. Missing tools needed

List any **missing tools** (scripts, services, APIs, CLI commands, or integrations) that would:

- Help capture, store, or prioritize ideas.
- Help turn ideas into shippable products (specs, builds, tests, deploy).
- Support SSOT (e.g. syncing product outcomes with docs, or verifying alignment).
- Improve safety or audit (e.g. change logs, approval flows, cost controls).

For each missing tool: name it, purpose, and where it would plug in (e.g. “Idea schema validator in `services/`”, “CLI: `counsel ideas export --format product-spec`”).

---

## 5. Constraints (North Star / Companion)

- **No** suggesting work that doesn’t map to mission or explicit outcome targets (Zero-Degree).
- **No** operational steps without evidence of user state or user confirmation.
- **No** output of secrets; if you see any, recommend rotation and redaction.
- **Self-programming:** snapshot before change, validate, rollback, fail-closed if validation impossible; never infer file paths.
- **High-risk:** money >$100, irreversible actions, deployment — require extra caution and human approval.

---

## 6. Optional: Quick Verification

After reviewing, the reviewer may optionally run:

- `npm test` (smoke: healthz, tools/status, auto-builder/status, website/audit).
- Grep for `ideaEngine`, `ideaToImplementationPipeline`, `executionQueue` in `server.js` to confirm wiring.

---

**End of handoff.** Please produce: **(A) 20 numbered suggestions** and **(B) Missing tools** as described above.
