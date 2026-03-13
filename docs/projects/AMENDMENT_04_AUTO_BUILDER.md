# AMENDMENT 04 — Auto-Builder / Self-Programming System
**Status:** LIVE (guarded)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
The system that writes, tests, and deploys its own code. Takes an idea → generates code → runs in sandbox → creates a snapshot → applies changes → validates → rolls back on failure. It is the most powerful and most dangerous feature in the platform.

**Mission:** Ship validated code improvements autonomously, with human approval for any production deployment.

---

## REVENUE ALIGNMENT
- Reduces developer cost → direct ROI
- Powers the idea-to-implementation pipeline (ideas become products without manual coding)
- Can build and deploy client-facing products (site builder, game publisher, etc.)

---

## TECHNICAL SPEC

### Files (Current)
| File | Purpose |
|------|---------|
| `core/auto-builder.js` | Core build orchestration |
| `core/idea-to-implementation-pipeline.js` | Full idea → deployed feature pipeline |
| `core/code-linter.js` | Code validation before apply |
| `services/snapshot-service.js` | System snapshots + rollback |
| `scripts/autonomy/run-nightly.js` | Overnight autonomous improvement run |
| `scripts/autonomy/queue.json` | Pending improvement queue |
| `tests/auto-builder-scheduler.test.js` | Auto-builder tests |
| `server.js` (lines 4296–4465, 7985–8149, 9382–9487, 9485–9808) | Self-modification engine, auto-builder endpoints, self-builder, pipeline endpoints — NEEDS EXTRACTION |

### DB Tables
| Table | Purpose |
|-------|---------|
| `system_snapshots` | Pre-change snapshots for rollback |
| `sandbox_tests` | Results of sandboxed code tests |
| `self_modifications` | Log of all self-applied changes |
| `build_artifacts` | Completed build outputs with receipts |
| `execution_tasks` | Task queue for async execution |
| `task_improvement_reports` | AI employee improvement reports |

### Key Endpoints
- `POST /api/v1/self-program` — trigger a self-programming task
- `POST /api/v1/auto-builder/run` — run auto-builder on an idea
- `GET /api/v1/auto-builder/status` — current build status
- `POST /api/v1/pipeline/run` — run idea-to-implementation pipeline
- `GET /api/v1/pipeline/status/:id` — pipeline run status

---

## CURRENT STATE
- **KNOW:** `autoDeploy` defaults to `false` — human approval required for production (SSOT compliant)
- **KNOW:** Snapshot-before-change is implemented in `idea-to-implementation-pipeline.js`
- **KNOW:** `build_artifacts` table records receipts on component completion
- **KNOW:** Nightly runner exists at `scripts/autonomy/run-nightly.js`
- **THINK:** Sandbox testing is limited — no real isolated execution environment, tests run in-process
- **DON'T KNOW:** Whether the self-modification engine has been successfully used to ship a real feature end-to-end

---

## REFACTOR PLAN
1. Move all auto-builder endpoints out of server.js → `routes/auto-builder-routes.js`
2. Move self-modification engine → `services/self-modification-engine.js`
3. Add proper sandboxing (Docker exec or vm2/isolated-vm) for code execution
4. Add human approval gate: builds queue in DB, dashboard shows "pending approval" items
5. Add build receipts endpoint: `GET /api/v1/auto-builder/receipts` shows what was built and when
6. Wire BullMQ `self-program` queue to a dedicated worker process

---

## NON-NEGOTIABLES (this project)
- `autoDeploy` MUST default to `false` — this is constitutional (North Star 4.2)
- Snapshot MUST be created before ANY file modification
- Rollback MUST be tested before the feature is considered complete
- Syntax validation (`node --check`) MUST pass before applying any JS change
- No self-modification of: server.js startup block, council-service.js, snapshot-service.js, this SSOT
- Human Guardian veto on any production deployment (North Star 3.1)
- All changes logged to `self_modifications` with what/when/why/who
