# SYSTEM CAPABILITY TRUTH AUDIT V1

**Status:** `AUTHORITATIVE AUDIT` (repo-truth; not runtime law)  
**Produced:** 2026-06-13 (v1.1 consumer fields) — read-only audit; **no runtime code modified**  
**Source inventory:** `docs/SYSTEM_CAPABILITY_INVENTORY.md` (317 capabilities)  
**Evidence spine:** `server.js` → `startup/register-runtime-routes.js` + `startup/routes/server-routes.js` + `core/two-tier-system-init.js` + `startup/boot-domains.js`  
**Companion audits:** `docs/architecture/factory-v1-blueprint-pack/SYSTEM_TOOL_INVENTORY_AUDIT_V1.md`, `docs/REPO_DEEP_AUDIT.md`, `docs/REPO_TRIAGE_NOTES.md`

---

## Executive summary

The inventory marked **299 / 317** capabilities as `PRESENT`. After mount-path, consumer-chain, and proof inspection, **only 63** qualify as **ACTIVE** (mounted or boot-scheduled with verified consumers). **219** are **PARTIAL** (code exists and is imported somewhere, but lacks runtime proof, env gates, or full governance wiring). **14** are **BUILT BUT DISCONNECTED** (artifact on disk; not reachable from the production spine). **15 MISSING**, **5 LEGACY**, **1 REJECT**, **2 ARCHIVE** (Hist-only; see §5).

**Core finding:** The repo is capability-rich but **governance-poor**. Agents rebuild because **mount truth is fragmented across three composition roots**, not because the code is absent.

| Metric | Count |
|--------|------:|
| Capabilities audited | 317 |
| ACTIVE | 63 |
| PARTIAL | 219 |
| BUILT BUT DISCONNECTED | 14 |
| LEGACY | 5 |
| ARCHIVE | 2 |
| REJECT | 1 |
| MISSING | 15 |

**Inventory drift:** `SYSTEM_CAPABILITY_INVENTORY.md` over-claims `PRESENT` by treating disk existence as operational truth. This audit downgrades without mount + consumer + (where claimed) proof evidence.

---

## Methodology

1. Parsed every capability row from `docs/SYSTEM_CAPABILITY_INVENTORY.md`.
2. Verified **Exists** via filesystem check on primary artifact path.
3. Verified **Mounted** if route filename appears in spine files **or** service is consumed by a mounted route chain (grep corpus under `routes/`, `startup/`, `server.js`).
4. Verified **Called** (import/reference in `routes/`, `services/`, `startup/`, `core/`, `server.js`, or invoked via `package.json` script).
5. Verified **Tested** via `tests/`, `scripts/*verify*`, `scripts/*proof*`, `scripts/*acceptance*`, or matching npm script.
6. Verified **Runtime proof** via `products/receipts/*.json`, acceptance script, or verify script only (not docs claims).
7. Recorded **Current consumers** — up to 3 importer files from ripgrep (Appendix A `Consumers` column).
8. Recorded **Missing consumers** — expected spine mount or proof path not found (e.g. `register-runtime-routes.js` for orphan routes).
9. Applied **manual overrides** for known spine facts (two-tier init, sleep-route regression, DONE gate helper in council builder).
10. **Confidence:** HIGH = ACTIVE + tested + proof; MEDIUM = ACTIVE/PARTIAL with called; LOW = disconnected/missing/legacy.

**Field legend (Appendix A):**

| Field | Meaning |
|-------|---------|
| Exists | Primary artifact on disk |
| Mounted | Route filename in spine OR boot-scheduled service |
| Called | Imported or script-invoked elsewhere in repo |
| Tested | Dedicated test or verify/proof script |
| Runtime proof | Receipt or live acceptance script reference |
| Consumers | Current importers (truncated) |
| Missing consumers | Expected wiring not present |

**Three composition roots (production Railway app):**

| Root | File | Mounts |
|------|------|--------|
| Runtime product | `startup/register-runtime-routes.js` | LifeOS, Voice Rail, builder supervisor, control plane (conditional), memory, C2 aggregate, TC/MLS, tokens |
| Server adjunct | `startup/routes/server-routes.js` | Legacy memory, Stripe, health, queue stats |
| Two-tier bundle | `core/two-tier-system-init.js` | Site builder, marketing stack routes, financial/billing/outreach, **legacy** `command-center-routes.js`, TCO, auto-builder |

**Factory canonical runtime (separate process):** `factory-staging/server.js` → `factory-staging/startup/register-routes.js` — execute-step, BPB intake gate, historian summary; **not** the Railway production spine unless explicitly cut over.

---

## 1. ACTIVE capabilities (63)

Mounted HTTP routes, boot schedulers with `createUsefulWorkGuard`, or CLI gates invoked in pre-commit/CI **with file existence confirmed**.

Representative ACTIVE surface (full list in Appendix A — status=ACTIVE):

- **BuilderOS:** builder supervisor, control plane routes, oil probe, builder supervisor path
- **C2:** lifeos-command-center aggregate, canonical admin/execution/backlog/system, autonomous telemetry, capability map, deliberation, gate-change, lane intel, TSOS kernel, OIL receipts, self-repair executor, agent recruitment (two-tier)
- **LifeOS:** auth, habits, finance, voice-rail mount, action inbox, workshop/copilot/simulator (optional dynamic mount), kids/teacher optional
- **Memory:** conversation history, memory intelligence, memory capsule, memory status/self-repair routes
- **TSOS:** api-cost-savings, token accounting, OCL, TCO routes, model performance, tokenos
- **Deployment:** railway managed env, project governance, stripe, billing, auto-builder (two-tier)
- **TC/Revenue:** tc-routes, mls-routes, clientcare billing, word keeper, site builder core/discovery/pipeline, outreach CRM, web intelligence, website audit, financial routes
- **Parts-car:** idea queue, twin, video, game, knowledge, teacher (optional)

**High-confidence ACTIVE (tests or receipts):** control plane (`builderos:control-plane:verify`), action inbox (`products/receipts/ACTION_INBOX_V1_ACCEPTANCE.json`), voice rail (`VOICE_RAIL_V1_ACCEPTANCE.json`, `VOICE_RAIL_CAPABILITY_PROOF.json`), token accounting (`tokens:verify`), builder blueprint gate + outcome verifier tests, TC morning digest module test.

---

## 2. PARTIAL capabilities (219)

Code exists and is referenced, but one or more of: no dedicated test, env-gated scheduler, duplicate authority path, incomplete governance (useful-work-guard, DONE gate, BP receipt), or parent route ACTIVE without product acceptance proof.

**High-impact PARTIAL (operational but under-proven):**

| Capability | Why PARTIAL | Last evidence |
|------------|-------------|---------------|
| Council builder `/build` | DONE gate helper wired (`evaluateBuildDoneGateForBuildResponse` in `routes/lifeos-council-builder-routes.js` ~L2115) but requires full ledger proof to pass | Am 46; helper tests |
| Governed loop executor | Consumed by command-control; ZONE3 blocks common targets | CC job receipts |
| Voice Rail sub-services (STT/TTS/router) | Consumed by mounted `lifeos-voice-rail-routes.js`; acceptance PASS but command→builder often blocked | `VOICE_RAIL_CAPABILITY_PROOF.json` |
| Useful work guard | Boot law exists; not all AI paths audited | `startup/boot-domains.js`, `ai:bypasses` script |
| Historian contract | `factory-staging` historian live; production Hist boundary not enforced | `factory-staging/startup/register-routes.js` |
| Email provision (Postmark) | Code wired; env vars often unset | `server-routes.js` healthz checks POSTMARK |
| BP priority queue / sync | Pre-commit HARD; not runtime API | `npm run lifeos:bp-priority:verify` |
| Factory autopilot | Boot scheduled; factory not production cutover | `services/factory-autopilot-scheduler.js` |

---

## 3. BUILT BUT DISCONNECTED capabilities (14)

Artifact exists; **not imported** into any spine path (verified 2026-06-13).

| Capability | Primary file | Blocker |
|------------|--------------|---------|
| TSOS task ledger | `routes/tsos-task-ledger-routes.js` | Am 46: superseded by `build_task_ledger`; never mounted |
| Marketing routes | `routes/marketing-routes.js` | Am 41 built; no `app.use` in spine |
| Sleep tracking | `routes/lifeos-sleep-routes.js` | **Regression:** docs claim mount; grep spine → **no import** |
| Conflict interrupt | `routes/lifeos-conflict-interrupt-routes.js` | Same regression |
| Decision review | `routes/lifeos-decision-review-routes.js` | Same regression |
| BoldTrail coaching | `routes/boldtrail-coaching-routes.js` | Orphan route file |
| Structural proof | `services/builderos-structural-proof.js` | CLI/audit only; no route consumer |
| Live enforcement pass | `services/builderos-live-enforcement-pass.js` | No spine import |
| Council bypass audit | `services/council-bypass-audit.js` | No spine import |
| Adaptive model routing | `services/adaptiveModel.js` | Duplicate of `ai-model-selector`; unused in spine |
| Site builder revenue | `services/site-builder-revenue-service.js` | No import located |
| Site builder prospect ranker | `services/site-builder-prospect-ranker.js` | No import located |
| Funnel analyzer | `services/funnel-analyzer.js` | No import located |
| Tools status | `services/tools-status.js` | No import located |

### 3.1 Consumer gap index (DISCONNECTED — missing consumers)

| Capability | Current consumers | Missing consumers |
|------------|-------------------|-------------------|
| TSOS task ledger | — | `startup/register-runtime-routes.js`; Am 46 control-plane mount |
| Marketing routes | — | `register-runtime-routes.js` or `two-tier-system-init.js` |
| Sleep / conflict-interrupt / decision-review | services only (no route import) | `startup/register-runtime-routes.js` mount (documented regression) |
| BoldTrail coaching | — | `boldtrail-routes.js` merge or spine `app.use` |
| Structural proof | manual/audit scripts only | scheduled verify hook; control-plane summary |
| Live enforcement pass | — | control-plane health integration |
| Council bypass audit | verify scripts only | council-service metering path |
| Site builder revenue / prospect ranker | — | `routes/site-builder-routes.js` factory |
| Funnel analyzer / tools status | — | site-builder or C2 dashboard mount |

---

## 4. DUPLICATE capabilities

| System A | System B | Survive | Merge | Retire |
|----------|----------|---------|-------|--------|
| `routes/lifeos-command-center-routes.js` | `routes/command-center-routes.js` | **lifeos-command-center** (register-runtime) | Fold any unique endpoints from legacy into aggregate | **command-center-routes** (two-tier only) |
| `build_task_ledger` + control plane | `routes/tsos-task-ledger-routes.js` | **build_task_ledger** (Am 46) | Compat read-only view if needed | **tsos-task-ledger routes** |
| `routes/lifeos-council-builder-routes.js` | `factory-staging/execute-step` | **Both** until cutover receipt | ADAPT missions per GOLDMINE | Neither yet |
| `core/auto-builder.js` + auto-builder routes | BuilderOS governed loop | **Governed loop** for product | Salvage queue ideas from auto-builder | auto-builder as primary builder |
| `enhanced-council-routes` | `lifeos-gate-change-routes` | **gate-change** for SSOT debate | Document when to call enhanced | — |
| `deliberation-governance-routes` | gate-change | **Both** (different amendments) | Unified operator table in docs | — |
| `memory-routes` (legacy) | `memory-intelligence-routes` | **memory-intelligence** | Legacy path `/api/v1/memory/legacy` | Expand legacy mount |
| `services/adaptiveModel.js` | `services/ai-model-selector.js` | **ai-model-selector** | — | **adaptiveModel** if unreferenced |
| `db/migrations/` | root `migrations/`, `database/` | **db/migrations/** | Inventory + deprecate | Parallel roots (REPO_DEEP_AUDIT Wave 2) |
| `factory-staging/` | `lumin-factory/factory-staging/` | **factory-staging/** at repo root | Bundle export only | Duplicate tree after verify |

---

## 5. LEGACY / ARCHIVE capabilities

**LEGACY (5):** Hist-owned or superseded — do not extend.

- `services/self-programming.js` — two-tier init still loads; superseded by BuilderOS governed loop
- `services/self-improvement-loop.js` — booted from `server.js`; superseded by factory autopilot
- `services/autonomous-efficiency-intelligence.js` — older metrics pattern
- `services/chatgpt-import.js` — import utility only
- Orphan route bucket per inventory — **9 route files** without spine import (see §3)

**ARCHIVE (2):**

- Historical server analysis scripts (`scripts/analyze-historical-server.*`) — Hist read/salvage
- Pre-2026 `prompts/` bulk (except locked contract files) — Hist boundary per `prompts/00-HIST-LEGACY-BOUNDARY.md`

---

## 6. REJECT capabilities (1)

| Capability | Reason |
|------------|--------|
| Continuous queue (`scripts/lifeos-builder-continuous-queue.mjs`) | **SHADOW** — contradicts BP law; `npm run lifeos:builder:queue` exists but not canonical queue (`builderos-reboot/BP_PRIORITY.json`) |

---

## 7. MISSING capabilities (15)

Documented in inventory or doctrine; **no trustworthy runtime artifact** or path not found:

- Product development gate (machine “BPB may begin now”)
- Native mobile mic (iOS/Android)
- Founder packet completeness checker (machine validator)
- Determinism checker (Builder tier harness — partial: `factory:determinism` scripts exist for factory only)
- Wearable integration (directory-only)
- User auth multi-user production validation
- Fraud detection runtime integration
- Document processor directory integration
- Blind spot detector / anomaly detection (directory paths not verified as wired)
- AI model service directory
- Pre-commit hooks (inventory lists `.git/hooks/` — exists locally but not repo-tracked artifact)
- Several inventory rows with **wrong relative paths** (missing `routes/` prefix) — treated as EXISTS failure until path corrected

---

## 8. Top 25 forgotten capabilities (gold on disk; underused)

Ranked by value × disconnect from current agent playbooks.

1. `services/builderos-structural-proof.js` — authority drift scanner; no scheduler
2. `services/builder-outcome-verifier.js` — wrong-outcome guard; not wired to all PASS paths
3. `services/builderos-build-done-gate-helper.js` — newly extracted; council builder imports it
4. `services/bp-priority-sync.js` — orphan PASS guard; CI only
5. `services/decision-ledger.js` — founder decisions; no unified UI
6. `services/mission-ledger.js` — mission runtime; low external docs
7. `factory-staging/factory-core/bpb/intake-gate.js` — product development gate **slice** exists in factory only
8. `services/builder-audit-before-done.js` — OIL audit path; builder supervisor only
9. `services/oil-proof-freshness.js` — C2 freshness; buried under command-center
10. `services/builderos-governed-proof-parity.js` — post-boot parity ticks
11. `services/lane-intel-service.js` — env-gated `LANE_INTEL_ENABLE_SCHEDULED=1`
12. `services/capability-map.js` — meta-capability; rarely referenced in missions
13. `services/site-builder-quality-scorer.js` — tested; site builder sub-module
14. `services/research-aggregator.js` — web intel support
15. `services/memory-intelligence-service.js` — full evidence API; under-marketed vs legacy memory
16. `services/constitutional-lock.js` — governance hook
17. `services/founder-direct-provider.js` — Voice Rail provider path
18. `services/lifeos-system-agent.js` — system agent; receipt test only
19. `services/token-optimizer.js` — TSOS savings core
20. `services/self-repair-prevention-registry.js` — OIL prevention hooks
21. `services/builderos-metrics-reporter.js` — BuilderOS telemetry
22. `services/deliberation-governance-service.js` — deliberation backend
23. `services/emergency-detection.js` — LifeOS safety
24. `services/preview-expiry-cron.js` — site builder 30-day expiry
25. `scripts/council-builder-preflight.mjs` — every session gate; not a “feature” in inventory mindset

---

## 9. Top 25 highest-value disconnected opportunities

1. `routes/marketing-routes.js` — Am 41 complete; mount in spine
2. `routes/lifeos-sleep-routes.js` — built + migrated; **remount** (regression)
3. `routes/lifeos-conflict-interrupt-routes.js` — remount
4. `routes/lifeos-decision-review-routes.js` — remount
5. `routes/tsos-task-ledger-routes.js` — mount OR delete after Am 46 cutover
6. `routes/boldtrail-coaching-routes.js` — mount or merge into boldtrail
7. `services/site-builder-revenue-service.js` — wire into site-builder factory
8. `services/site-builder-prospect-ranker.js` — wire into prospect pipeline
9. `services/funnel-analyzer.js` — marketing/site builder analytics
10. `services/builderos-live-enforcement-pass.js` — wire to control plane health
11. `services/council-bypass-audit.js` — wire to council metering
12. `services/tools-status.js` — operator dashboard candidate
13. Product development gate — **port** `factory-staging` intake gate to production
14. DONE gate full ledger wiring on `/build` start/complete (Am 46 Phase 2)
15. `command-center-routes.js` — dedupe vs lifeos-command-center
16. Postmark env — unlock outreach/site builder live email
17. Historian enforcement — wire Hist registry checks to runtime
18. `services/adaptiveModel.js` — consolidate routing
19. Native Voice Rail mic — mobile bridge
20. Wearable integration directory — HealthKit proof
21. `factory-staging` cutover to Railway — single builder authority
22. `enhanced-council` vs `gate-change` operator decision table
23. Multi-user auth production validation
24. `services/fraud-detection/` — mount or archive
25. `services/document-processor/` — mount or archive

---

## 10. Top 25 deletion candidates

**Do not delete without grep + founder hold.** Ranked by barnacle signal from `REPO_DEEP_AUDIT.md` + this audit.

1. `docs/THREAD_REALITY/` (~1.4GB) — external archive
2. `backups/` in git — object storage
3. Tracked `logs/` — gitignore
4. `my_project/`, `my-project/` — scratch
5. `routes/command-center-routes.js` — after endpoint merge
6. `routes/tsos-task-ledger-routes.js` — after Am 46 cutover
7. `scripts/lifeos-builder-continuous-queue.mjs` — REJECT shadow queue
8. `services/self-programming.js` — after two-tier decoupling
9. `services/self-improvement-loop.js` — after autopilot proof
10. `services/chatgpt-import.js` — one-off utility
11. `services/autonomous-efficiency-intelligence.js`
12. `services/adaptiveModel.js` — if grep confirms zero imports
13. `services/tools-status.js` — if no mount plan
14. `services/funnel-analyzer.js` — if no mount plan
15. Duplicate `lumin-factory/` tree — after bundle verify
16. Root `migrations/` — after Wave 2 authority pick
17. Root `database/` SQL duplicates
18. `src/`, `apps/` experiment trees — if spine grep clean
19. `ar-project/`, tiny spike dirs from catalog
20. Generated `audit/reports/` committed copies
21. `routes/boldtrail-coaching-routes.js` — if merged into boldtrail
22. Legacy `command-center` HTML/JS if overlay superseded
23. Duplicate api-cost-savings mount path (verify single owner)
24. Orphan CJS route experiments (2026-04-18 audit remainder)
25. `core/enhanced-ai-usage-tracker.js` — Am 46 marked BLOCKED/superseded

---

## 11. Duplicate-system matrix

See §4. Family sizes:

| Family | Members | Severity |
|--------|---------|----------|
| Command center | 2 route modules | HIGH — operator confusion |
| Build ledger | 3 tables/routes | HIGH — “if not in ledger…” law |
| Builder execution | 4 paths (council, factory, auto, shadow queue) | CRITICAL |
| Consensus / deliberation | 4 endpoints | MEDIUM |
| Memory API | 3 mounts (legacy, intelligence, capsule) | MEDIUM |
| Migration SQL roots | 3 directories | MEDIUM — schema drift risk |
| Factory runtime trees | 2+ copies | MEDIUM |
| Model routing | 2–3 services | LOW |

---

## 12. Runtime mount matrix

| Mount root | Invoked from | Approx routes | Notes |
|------------|--------------|---------------|-------|
| `register-runtime-routes.js` | `server.js` L1003 | ~85 static + 5 optional | Primary LifeOS + builder + memory |
| `server-routes.js` | `server.js` L983 | ~10 | Legacy memory, Stripe, health |
| `two-tier-system-init.js` | `server.js` L1505 | ~20+ | Site builder, marketing, billing, **legacy CC** |
| `server.js` direct | TCO L1508+, modules | TCO, WS, modules | Conditional `SMOKE_MODE` |
| `factory-staging/server.js` | Separate deploy | 10 factory endpoints | Canonical factory; not production spine |
| **Unmounted** | — | 9 `routes/*.js` | See §3 |

---

## 13. BuilderOS capability matrix

| Capability | Status | Mounted | Consumer | Tests | Proof |
|------------|--------|---------|----------|-------|-------|
| Builder supervisor | ACTIVE | Y | Y | Y | partial |
| Council builder /build | PARTIAL | Y | Y | partial | preflight |
| Control plane | ACTIVE | Y* | Y | Y | verify script |
| Command control | PARTIAL | Y | Y | partial | CC jobs |
| Governed loop | PARTIAL | N | Y | Y | platform gap-fill test |
| DONE gate helper | PARTIAL | N | Y | Y | route wiring test |
| Blueprint gate | PARTIAL | N | Y | Y | — |
| BP priority | PARTIAL | N | Y | Y | bp-priority verify |
| Factory autopilot | PARTIAL | boot | Y | N | factory proofs |
| Continuous queue | REJECT | N | Y | N | — |
| Product dev gate | MISSING | N | N | N | factory intake only |
| Structural proof | BUILT BUT DISCONNECTED | N | N | N | manual CLI |

*Conditional on `deps.builderOSControlPlane` at boot.

---

## 14. LifeOS capability matrix

| Domain | ACTIVE routes | PARTIAL services | DISCONNECTED |
|--------|---------------|------------------|--------------|
| Core/domains | ~35 mounted `/api/v1/lifeos/*` | Most `services/lifeos-*` | sleep, conflict-interrupt, decision-review |
| Voice Rail | voice-rail routes | 10+ voice-rail services | native mic |
| Action Inbox | action-inbox | action-inbox service | — |
| Optional | workshop, copilot, simulator, kids, teacher | — | — |
| Auth | auth routes | multi-user validation | — |

---

## 15. Voice Rail capability matrix

| Component | Status | Evidence |
|-----------|--------|----------|
| Core `voice-rail-v1.js` | PARTIAL | Mounted; `VOICE_RAIL_V1_ACCEPTANCE.json` |
| STT/TTS/Router | PARTIAL | Imported by `lifeos-voice-rail-routes.js` |
| Command executor | PARTIAL | CC integration; often ZONE3 blocked |
| Execution truth | PARTIAL | `voice-rail-execution-truth.js`; capability proof |
| Founder provider | PARTIAL | `FOUNDER_DIRECT_PROVIDER_TEST.json` |
| Action Inbox | ACTIVE | acceptance receipt PASS |
| Native mic | MISSING | web UI only |

---

## 16. C2 capability matrix

| Surface | Status | Mount path |
|---------|--------|------------|
| lifeos-command-center aggregate | ACTIVE | register-runtime |
| command-center-routes (legacy) | PARTIAL | two-tier only — **duplicate** |
| Canonical admin/execution/backlog/system | ACTIVE | register-runtime |
| Autonomous telemetry | ACTIVE | register-runtime |
| Self-repair executor | ACTIVE | register-runtime |
| Deliberation governance | ACTIVE | `/api/v1/lifeos/deliberation` |
| Gate change | ACTIVE | `/api/v1/lifeos/gate-change` |
| BuilderOS command control | ACTIVE | `/api/v1/lifeos/builderos/command-control` |
| Capability map | ACTIVE | `/api/v1/capability-map` |

---

## 17. Memory / Historian capability matrix

| Layer | Status | Notes |
|-------|--------|-------|
| Memory intelligence | ACTIVE | `/api/v1/memory/evidence` + compat alias |
| Memory capsule | ACTIVE | `/api/v1/memory/capsules` |
| Legacy memory routes | PARTIAL | `/api/v1/memory/legacy` |
| 20+ memory sub-services | PARTIAL | Consumed by intelligence/capsule |
| Historian (factory) | PARTIAL | `factory-staging` historian live |
| Historian (NSSOT §2.0I) | PARTIAL | Enforcement not production-wide |
| Hist domain registry | LEGACY/ARCHIVE | `builderos-reboot/HIST_DOMAIN_REGISTRY.json` |

---

## 18. TSOS capability matrix

| Component | Status | Mount |
|-----------|--------|-------|
| Token accounting | ACTIVE | `/api/v1/tokens` |
| Operator consumption ledger | ACTIVE | `/api/v1/tokens` |
| API cost savings | ACTIVE | register-runtime + two-tier duplicate |
| TokenOS | ACTIVE | tokenos routes |
| Platform kernel | ACTIVE | `/api/v1/kernel` conditional |
| Model performance | ACTIVE | `/api/v1/model-performance` |
| TSOS efficiency | ACTIVE | register-runtime |
| TSOS task ledger routes | BUILT BUT DISCONNECTED | not mounted |
| Savings ledger / token optimizer | PARTIAL | consumed by council |

---

## Appendix A — Full capability audit (317 rows)

| Capability | Status | Exists | Mounted | Called | Tested | Runtime proof | Current consumers | Missing consumers |
|------------|--------|--------|---------|--------|--------|---------------|-------------------|-------------------|
| Builder supervisor / task runner | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Builder preflight gate | PARTIAL | Y | Y | Y | Y | partial | package.json; scripts/system-maturity-check.mjs; scripts/lifeos-builder-build-chat.mjs | runtime proof receipt |
| Builder council review | PARTIAL | Y | Y | Y | Y | partial | scripts/verify-oc-009-status.mjs; scripts/verify-council-bypass-audit.mjs; scripts/verify-gap-001-gap.mjs | runtime proof receipt |
| Build audit before done | PARTIAL | Y | Y | Y | Y | partial | services/builder-oil-phase7-probe.js; routes/lifeos-command-center-routes.js; services/self-repair-executor.js | runtime proof receipt |
| Build critic | PARTIAL | Y | Y | Y | N | N | core/auto-builder.js | runtime proof receipt |
| Outcome verifier | PARTIAL | Y | Y | Y | Y | partial | tests/builder-outcome-verifier.test.js; services/builderos-governed-loop-executor.js | runtime proof receipt |
| Blueprint gate | PARTIAL | Y | Y | Y | Y | partial | tests/builderos-governed-loop-platform-gap-fill.test.js; tests/builder-blueprint-gate.test.js; routes/lifeos-council-builder-routes.js | runtime proof receipt |
| Instruction target resolver | PARTIAL | Y | Y | Y | Y | partial | tests/builderos-pbb-voice-rail-target.test.js; routes/lifeos-council-builder-routes.js; services/voice-rail-command-executor.js | runtime proof receipt |
| Build pipeline | PARTIAL | Y | Y | Y | N | N | services/builderos-precommit-governance.js; services/builderos-structural-proof.js | runtime proof receipt |
| Governed loop executor | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-builderos-command-control-routes.js; tests/builderos-governed-loop-platform-gap-fill.test.js; services/voice-rail-command-executor.js | runtime proof receipt |
| Patch mode policy | PARTIAL | Y | Y | Y | N | N | services/builderos-oil-job-audit.js; services/builderos-build-pipeline.js; services/builderos-pbb-plan.js | runtime proof receipt |
| Routing policy | PARTIAL | Y | Y | Y | N | N | routes/lifeos-council-builder-routes.js; services/builderos-tsos-routing.js | runtime proof receipt |
| Structural proof | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | scripts/verify-builderos-control-plane.mjs; npm run builderos:control-plane:verify |
| Metrics reporter | PARTIAL | Y | Y | Y | N | N | routes/autonomous-telemetry-routes.js; services/builderos-system-alpha-readiness.js | runtime proof receipt |
| Control plane | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/verify-builderos-control-plane.mjs |  |
| Command + control service | PARTIAL | Y | Y | Y | N | N | routes/lifeos-command-center-routes.js; routes/lifeos-builderos-command-control-routes.js; services/voice-rail-system-operator.js | runtime proof receipt |
| Alpha readiness guards | PARTIAL | Y | Y | Y | N | N | routes/lifeos-command-center-routes.js; services/builderos-structural-proof.js | runtime proof receipt |
| Oil job audit | PARTIAL | Y | Y | Y | N | N | services/builderos-governed-loop-executor.js | runtime proof receipt |
| Governed proof parity | PARTIAL | Y | Y | Y | Y | partial | startup/boot-domains.js; tests/builderos-governed-proof-parity.test.js; services/builderos-governed-loop-executor.js | runtime proof receipt |
| Live enforcement pass | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| TSOS evidence | PARTIAL | Y | Y | Y | N | N | routes/tsos-efficiency-routes.js; services/builderos-tsos-routing.js | runtime proof receipt |
| TSOS hook service | PARTIAL | Y | Y | Y | N | N | services/builderos-tsos-evidence.js; services/builderos-governed-loop-executor.js | runtime proof receipt |
| Pre-commit governance | PARTIAL | Y | Y | Y | N | N | routes/lifeos-council-builder-routes.js; services/builderos-structural-proof.js | runtime proof receipt |
| Phase14 ledger | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-command-center-routes.js; scripts/oil-phase14-railway-canonical.mjs; scripts/oil-missed-issues-summary.mjs | runtime proof receipt |
| BP priority queue | PARTIAL | Y | Y | Y | Y | partial | services/voice-rail-v1.js; services/voice-rail-system-operator.js; scripts/verify-bp-priority-guardrails.mjs | runtime proof receipt |
| Oil probe (Phase 7) | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; services/builder-oil-phase7-probe.js; scripts/oil-invoke-phase7-railway-probe.mjs |  |
| Factory autopilot scheduler | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/command-center-routes.js | runtime proof receipt |
| Factory recovery proof | PARTIAL | Y | Y | Y | N | N | routes/command-center-routes.js | runtime proof receipt |
| Continuous queue (shadow queue) | REJECT | Y | Y | Y | Y | partial | package.json; scripts/lifeos-builder-supervisor.mjs; scripts/builder-slice-throughput-meter.mjs |  |
| Product development gate | MISSING | N | N | N | N | N | — | factory-staging BPB intake; production /build preflight |
| Founder packet completeness checker | MISSING | N | N | N | N | N | — |  |
| Determinism checker at Builder tier | MISSING | N | N | N | N | N | — |  |
| Command center aggregate | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/AGENTS.md; scripts/verify-cc-communication.mjs |  |
| Supervised autonomy readiness | PARTIAL | Y | Y | Y | N | N | routes/lifeos-command-center-routes.js; services/self-repair-executor.js; services/builderos-system-alpha-readiness.js | runtime proof receipt |
| PB execution authority | PARTIAL | Y | Y | Y | N | N | services/supervised-autonomy-readiness.js; services/oil-self-repair-detector.js | runtime proof receipt |
| Proof freshness | PARTIAL | Y | Y | Y | Y | partial | tests/oil-proof-freshness.test.js; routes/lifeos-command-center-routes.js; services/supervised-autonomy-readiness.js | runtime proof receipt |
| Phase 14 cert | MISSING | N | N | N | N | N | — |  |
| Canonical admin routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Canonical system routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Canonical execution routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Canonical backlog | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Autonomous telemetry | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; services/builderos-structural-proof.js |  |
| Capability map | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Mission ledger | PARTIAL | Y | Y | Y | N | N | routes/lifeos-commitment-routes.js; routes/mission-routes.js | runtime proof receipt |
| Deliberation governance | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Gate change council runner | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs; services/lifeos-gate-change-council-run.js |  |
| Founder debrief | PARTIAL | Y | Y | Y | N | N | services/deliberation-governance-service.js | runtime proof receipt |
| Founder value engine | PARTIAL | Y | Y | Y | Y | partial | scripts/governed-overnight-backlog-run.mjs | runtime proof receipt |
| Founder direct provider | PARTIAL | Y | Y | Y | Y | partial | package.json; routes/lifeos-voice-rail-routes.js; services/voice-rail-v1.js | runtime proof receipt |
| Lane intel | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs |  |
| TSOS efficiency | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js; services/builderos-structural-proof.js |  |
| TSOS platform kernel | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/verify-tsos-platform-kernel.mjs |  |
| Telemetry cycle guard | PARTIAL | Y | Y | Y | N | N | services/autonomous-telemetry-session.js | runtime proof receipt |
| Constitutional lock | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-ethics-routes.js; scripts/lifeos-verify.mjs; services/sovereignty-check.js | runtime proof receipt |
| Kingsman gate | PARTIAL | Y | Y | Y | N | N | services/council-service.js | runtime proof receipt |
| Sovereignty check | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-ethics-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| OIL security receipts | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Self-repair executor | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/builderos-autonomy-guard-audit.mjs |  |
| Agent recruitment routes | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| Runtime mode controller | PARTIAL | Y | Y | Y | Y | partial | scripts/autonomy/builder-supervisor.js | runtime proof receipt |
| Useful work guard | PARTIAL | Y | Y | Y | Y | partial | startup/boot-domains.js; scripts/generate-agent-rules.mjs; scripts/seed-epistemic-facts.mjs | runtime proof receipt |
| Metered AI call | PARTIAL | Y | Y | Y | Y | partial | scripts/verify-gap-006-gap.mjs; scripts/verify-token-accounting-enforcement.mjs; scripts/verify-ai-call-bypasses.mjs | runtime proof receipt |
| Core engine + gateway | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs |  |
| Auth (user registration, login) | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-assessment-battery-routes.js; startup/register-runtime-routes.js; routes/lifeos-sleep-routes.js | runtime proof receipt |
| Daily briefing | PARTIAL | Y | Y | Y | N | N | routes/lifeos-briefing-routes.js | runtime proof receipt |
| Habits + streaks | PARTIAL | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/lifeos-habits-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Commitments | PARTIAL | Y | Y | Y | N | N | routes/lifeos-commitment-routes.js | runtime proof receipt |
| Emotional layer | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-emotional-routes.js; scripts/lifeos-verify.mjs; services/lifeos-scheduled-jobs.js | runtime proof receipt |
| Health | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-health-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Family sync | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-family-routes.js; routes/lifeos-auth-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Purpose discovery | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-purpose-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Decisions | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-decisions-routes.js; scripts/lifeos-verify.mjs; services/lifeos-money-decision-bridge.js | runtime proof receipt |
| Identity intelligence | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs |  |
| Vision / Future Self | PARTIAL | Y | Y | Y | N | N | routes/lifeos-simulator-routes.js | runtime proof receipt |
| Finance OS | PARTIAL | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/lifeos-finance-routes.js; tests/builderos-governed-loop-platform-gap-fill.test.js | runtime proof receipt |
| Conflict coach | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-conflict-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Mediation engine | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-mediation-routes.js; scripts/lifeos-verify.mjs; services/response-variety.js | runtime proof receipt |
| Healing | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs |  |
| Legacy builder | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-legacy-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Ethics | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/lifeos-verify.mjs |  |
| Growth + mastery | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-growth-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Scorecard / scoreboard | PARTIAL | Y | Y | Y | N | N | routes/lifeos-scorecard-routes.js | runtime proof receipt |
| Victory vault | PARTIAL | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/lifeos-victory-vault-routes.js; routes/lifeos-council-builder-routes.js | runtime proof receipt |
| Weekly review | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; routes/lifeos-weekly-review-routes.js; services/lifeos-scheduled-jobs.js | runtime proof receipt |
| Assessment battery | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; routes/lifeos-assessment-battery-routes.js | runtime proof receipt |
| Children (Kids OS) | PARTIAL | Y | Y | Y | N | N | routes/kids-os-routes.js | runtime proof receipt |
| Communication OS | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-communication-routes.js; scripts/verify-lifeos-communication.mjs | runtime proof receipt |
| Calendar integration | PARTIAL | Y | Y | Y | N | N | routes/lifeos-core-routes.js; services/lifeos-ambient-intelligence.js; routes/lifeos-ambient-routes.js | runtime proof receipt |
| Ambient intelligence | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; routes/lifeos-ambient-intelligence-routes.js | runtime proof receipt |
| Cycle tracking | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; routes/lifeos-cycle-routes.js | runtime proof receipt |
| Sleep | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | routes/lifeos-sleep-routes.js | startup/register-runtime-routes.js |
| Backtest | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Extension points | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Council builder | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; tests/builderos-build-done-gate-route-wiring.test.js; tests/builderos-governed-loop-platform-gap-fill.test.js |  |
| LifeOS direct action | PARTIAL | Y | Y | Y | Y | partial | package.json; startup/register-runtime-routes.js; routes/lifeos-direct-action-routes.js | runtime proof receipt |
| System proof | PARTIAL | Y | Y | Y | N | N | routes/lifeos-system-proof-routes.js; services/founder-provider-tool-action.js; services/lifeos-direct-action.js | runtime proof receipt |
| System agent | PARTIAL | Y | Y | Y | N | N | routes/lifeos-voice-rail-routes.js; services/voice-rail-v1.js; services/voice-rail-command-executor.js | runtime proof receipt |
| LifeOS chat | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/builder-inner-supervisor.mjs; scripts/lifeos-verify.mjs |  |
| Lumin AI persona | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-chat-routes.js; scripts/lifeos-builder-build-chat.mjs; routes/lifeos-voice-rail-routes.js | runtime proof receipt |
| Wearable integration | MISSING | N | N | N | N | N | — |  |
| Conflict interrupt | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | routes/lifeos-conflict-interrupt-routes.js | startup/register-runtime-routes.js |
| Decision review | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | routes/lifeos-decision-review-routes.js | startup/register-runtime-routes.js |
| Workshop of mind | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Copilot | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Simulator | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Emergency detection | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-health-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Self-sabotage monitor | PARTIAL | Y | Y | Y | N | N | routes/lifeos-emotional-routes.js | runtime proof receipt |
| User auth (multi-user) | MISSING | N | N | N | N | N | — |  |
| Voice Rail v1 core | PARTIAL | Y | Y | Y | Y | partial | package.json; tests/builder-blueprint-gate.test.js; routes/public-routes.js | runtime proof receipt |
| STT (speech-to-text) | PARTIAL | Y | Y | Y | N | N | routes/lifeos-voice-rail-routes.js | runtime proof receipt |
| TTS (text-to-speech) | PARTIAL | Y | Y | Y | N | N | routes/lifeos-voice-rail-routes.js | runtime proof receipt |
| Intent router | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js; services/lifeos-founder-command-class.js | runtime proof receipt |
| Command executor | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js; services/voice-rail-system-operator.js; services/voice-rail-intent-router.js | runtime proof receipt |
| System direct path | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js; services/voice-rail-system-operator.js; services/lifeos-founder-system-action.js | runtime proof receipt |
| System operator path | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js | runtime proof receipt |
| Founder memory integration | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js | runtime proof receipt |
| Execution truth receipts | PARTIAL | Y | Y | Y | Y | partial | services/voice-rail-v1.js; routes/lifeos-voice-rail-routes.js; scripts/run-voice-rail-capability-proof.mjs | runtime proof receipt |
| Usage receipt | PARTIAL | Y | Y | Y | N | N | services/voice-rail-v1.js | runtime proof receipt |
| Attachment handling | PARTIAL | Y | Y | Y | N | N | routes/lifeos-voice-rail-routes.js; services/voice-rail-v1.js | runtime proof receipt |
| Provider proof hard-route | PARTIAL | Y | Y | Y | N | N | routes/lifeos-system-proof-routes.js; services/voice-rail-v1.js; routes/lifeos-voice-rail-routes.js | runtime proof receipt |
| Action Inbox | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Native mobile mic (iOS/Android) | MISSING | N | N | N | N | N | — |  |
| Conversation history | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Memory intelligence | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Memory capsule | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Working memory | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Institutional memory | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory relationship graph | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory links | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory provenance | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs; services/memory-retrieval.js | runtime proof receipt |
| Memory trust bridge | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory healing | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-healing-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Memory health | PARTIAL | Y | Y | Y | N | N | routes/memory-capsule-routes.js | runtime proof receipt |
| Memory explanation | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory receipts | PARTIAL | Y | Y | Y | Y | partial | routes/memory-capsule-routes.js; scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory signal intake | PARTIAL | Y | Y | Y | Y | partial | routes/memory-capsule-routes.js; scripts/memory-pressure-test.mjs; services/voice-rail-founder-memory.js | runtime proof receipt |
| Memory contradiction | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory zombie (stale detection) | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory OIL bridge | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory legacy bridge | PARTIAL | Y | Y | Y | Y | partial | scripts/memory-pressure-test.mjs | runtime proof receipt |
| Memory candidate | PARTIAL | Y | Y | Y | Y | partial | routes/memory-capsule-routes.js; services/memory-working.js; scripts/memory-pressure-test.mjs | runtime proof receipt |
| Self-repair memory | PARTIAL | Y | Y | Y | N | N | routes/self-repair-executor-routes.js; routes/memory-self-repair-routes.js; services/self-repair-prevention-registry.js | runtime proof receipt |
| Lumin memory fetcher | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-core-routes.js; scripts/run-memory-import.mjs; scripts/lifeos-verify.mjs | runtime proof receipt |
| Delta context | PARTIAL | Y | Y | Y | N | N | services/council-service.js | runtime proof receipt |
| Memory status routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Memory self-repair routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Historian canonical contract (NSSOT §2.0I) | MISSING | N | N | N | N | N | — |  |
| OIL security receipts | PARTIAL | Y | Y | Y | Y | partial | routes/oil-security-receipt-routes.js; routes/gemini-proof-routes.js; routes/lifeos-command-center-routes.js | runtime proof receipt |
| OIL daily summary | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js | runtime proof receipt |
| OIL proof freshness | PARTIAL | Y | Y | Y | Y | partial | tests/oil-proof-freshness.test.js; routes/lifeos-command-center-routes.js; services/supervised-autonomy-readiness.js | runtime proof receipt |
| OIL self-repair detector | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-command-center-routes.js; scripts/council-builder-preflight.mjs; scripts/oil-self-repair-audit.mjs | runtime proof receipt |
| Self-repair executor | PARTIAL | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/self-repair-executor-routes.js; scripts/builderos-autonomy-guard-audit.mjs | runtime proof receipt |
| Self-repair deploy scheduler | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/self-repair-executor-routes.js; services/autonomous-telemetry-session.js | runtime proof receipt |
| Self-repair lesson classifier | PARTIAL | Y | Y | Y | N | N | services/self-repair-prevention-registry.js; services/self-repair-memory.js | runtime proof receipt |
| Self-repair execution log | PARTIAL | Y | Y | Y | N | N | routes/self-repair-executor-routes.js; services/self-repair-executor.js | runtime proof receipt |
| Self-repair prevention hook log | PARTIAL | Y | Y | Y | N | N | services/self-repair-prevention-hook-planner.js; services/self-repair-deploy-scheduler.js | runtime proof receipt |
| Self-repair prevention hook planner | PARTIAL | Y | Y | Y | N | N | routes/self-repair-executor-routes.js; services/builderos-system-alpha-readiness.js; services/autonomous-telemetry-session.js | runtime proof receipt |
| Self-repair prevention registry | PARTIAL | Y | Y | Y | N | N | routes/self-repair-executor-routes.js; services/self-repair-prevention-hook-planner.js | runtime proof receipt |
| Emergency repair | PARTIAL | Y | Y | Y | N | N | routes/lifeos-copilot-routes.js | runtime proof receipt |
| Gemini proof routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| System proof event | PARTIAL | Y | Y | Y | N | N | routes/lifeos-system-proof-routes.js; services/founder-provider-tool-action.js; services/lifeos-direct-action.js | runtime proof receipt |
| Integrity engine | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; routes/word-keeper-routes.js | runtime proof receipt |
| Integrity score | PARTIAL | Y | Y | Y | Y | partial | scripts/lifeos-verify.mjs; routes/lifeos-core-routes.js | runtime proof receipt |
| Council bypass audit | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Contradiction engine | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-identity-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Blind spot detector | MISSING | N | N | N | N | N | — |  |
| AI guard | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Anomaly detection | MISSING | N | N | N | N | N | — |  |
| Truth delivery | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-emotional-routes.js; routes/lifeos-core-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Response variety | PARTIAL | Y | Y | Y | Y | partial | services/mediation-engine.js; scripts/lifeos-verify.mjs; services/communication-profile.js | runtime proof receipt |
| Fraud detection | MISSING | N | N | N | N | N | — |  |
| Consent registry | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-ethics-routes.js; services/research-aggregator.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Data sovereignty | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-ethics-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| API cost savings | ACTIVE | Y | Y | Y | Y | partial | server.js; startup/register-runtime-routes.js; core/two-tier-system-init.js |  |
| TokenOS core | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Token accounting | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/verify-token-accounting-unified.mjs |  |
| Operator consumption ledger | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/verify-token-accounting-unified.mjs; scripts/verify-operator-consumption-ledger.mjs |  |
| Token optimizer | PARTIAL | Y | Y | Y | N | N | services/council-service.js; services/prompt-translator.js | runtime proof receipt |
| TSOS task ledger | BUILT BUT DISCONNECTED | Y | N | Y | Y | partial | scripts/verify-gap-020-gap.mjs; scripts/verify-oc-013-status.mjs | startup/register-runtime-routes.js; server.js |
| TCO agent routes | ACTIVE | Y | Y | Y | N | N | server.js; core/two-tier-system-init.js |  |
| TCO routes | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/verify-ai-call-bypasses.mjs |  |
| TSOS platform kernel | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/verify-tsos-platform-kernel.mjs |  |
| TSOS efficiency | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js; services/builderos-structural-proof.js |  |
| Model performance tracking | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Response cache | PARTIAL | Y | Y | Y | N | N | server.js; startup/register-runtime-routes.js; routes/command-center-routes.js | runtime proof receipt |
| Free tier governor | PARTIAL | Y | Y | Y | N | N | services/council-service.js; routes/twin-routes.js | runtime proof receipt |
| Savings ledger | PARTIAL | Y | Y | Y | N | N | server.js; services/council-service.js; routes/twin-routes.js | runtime proof receipt |
| AI model selector | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Adaptive model routing | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| TokenOS quality check | PARTIAL | Y | Y | Y | N | N | routes/tokenos-routes.js | runtime proof receipt |
| Monetization map | PARTIAL | Y | Y | Y | N | N | routes/lifeos-legacy-routes.js; routes/lifeos-purpose-routes.js | runtime proof receipt |
| Deployment service (git + Railway) | PARTIAL | Y | Y | Y | Y | partial | package.json; server.js; tests/deployment-service-package-guard.test.js | runtime proof receipt |
| Railway managed env routes | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Env validator (boot-time) | PARTIAL | Y | Y | Y | N | N | server.js; services/ConfigService.js | runtime proof receipt |
| Env registry map | PARTIAL | Y | Y | Y | N | N | routes/site-builder-routes.js; routes/railway-managed-env-routes.js; routes/site-builder-launch-readiness-routes.js | runtime proof receipt |
| Migration runner | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| DB health monitor | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Project governance routes | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/seed-projects.mjs |  |
| SSOT check script | PARTIAL | Y | Y | Y | Y | partial | scripts/system-maturity-check.mjs; scripts/ssot-validate.mjs | runtime proof receipt |
| Pre-commit hooks | MISSING | N | N | N | N | N | — |  |
| Coupling check | PARTIAL | Y | Y | Y | Y | partial | scripts/seed-projects.mjs | runtime proof receipt |
| Snapshot service | PARTIAL | Y | Y | Y | N | N | server.js; core/idea-to-implementation-pipeline.js | runtime proof receipt |
| Sandbox service | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Account manager | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Stripe integration | ACTIVE | Y | Y | Y | Y | partial | server.js |  |
| Billing routes | ACTIVE | Y | Y | Y | Y | partial | server.js; startup/register-runtime-routes.js; scripts/extract-routes.py |  |
| Auto-builder routes | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| TC core routes | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| MLS routes | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| TC assistant service | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC workflow runner | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC status engine | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js; services/tc-portal-service.js; services/tc-intake-workspace-service.js | runtime proof receipt |
| TC email monitor + intake | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js; services/tc-coordinator.js | runtime proof receipt |
| TC document validator | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js; services/tc-inspection-forward-service.js; services/tc-doc-intake.js | runtime proof receipt |
| TC browser agent | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/mls-routes.js; services/tc-listing-skyslope-sync.js | runtime proof receipt |
| TC inspection service | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC offer prep | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC morning digest | PARTIAL | Y | Y | Y | Y | partial | package.json; tests/deployment-service-package-guard.test.js; tests/tc-morning-digest-service-module.test.js | runtime proof receipt |
| TC coordinator | PARTIAL | Y | Y | Y | N | N | startup/register-runtime-routes.js; startup/boot-domains.js; routes/tc-routes.js | runtime proof receipt |
| TC Asana sync | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC alert service | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC portal | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC Stripe | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| TC pricing | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js; services/tc-stripe-service.js | runtime proof receipt |
| TC R4R attachment classify | PARTIAL | Y | Y | Y | Y | partial | tests/tc-r4r.test.js; routes/tc-routes.js | runtime proof receipt |
| TC report service | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC review package | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| TC SkySlope listing sync | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC mobile link | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| TC TD party sync | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js; services/tc-td-workflow-runner.js | runtime proof receipt |
| TC form knowledge | PARTIAL | Y | Y | Y | N | N | routes/tc-routes.js | runtime proof receipt |
| BoldTrail real estate | PARTIAL | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py | runtime proof receipt |
| MLS deal scanner | PARTIAL | Y | Y | Y | N | N | routes/mls-routes.js | runtime proof receipt |
| GLVAR monitor | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/tc-routes.js | runtime proof receipt |
| ClientCare billing | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| ClientCare browser service | PARTIAL | Y | Y | Y | N | N | routes/clientcare-billing-routes.js | runtime proof receipt |
| Life coaching / Twin | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| Word Keeper | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |
| Word Keeper transcriber | PARTIAL | Y | Y | Y | N | N | routes/word-keeper-routes.js; services/tc-interaction-service.js; services/marketing-transcriber.js | runtime proof receipt |
| Site builder core | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; services/lifeos-communication-os-service.js |  |
| Site builder discovery | ACTIVE | Y | Y | Y | N | N | core/two-tier-system-init.js |  |
| Site builder launch readiness | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Site builder pipeline report | ACTIVE | Y | Y | Y | Y | partial | core/two-tier-system-init.js |  |
| Site builder revenue | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Site builder opportunity scorer | PARTIAL | Y | Y | Y | Y | partial | services/prospect-pipeline.js; scripts/site-builder-batch-rank.mjs; routes/site-builder-routes.js | runtime proof receipt |
| Site builder quality scorer | PARTIAL | Y | Y | Y | Y | partial | tests/site-builder-quality-scorer.test.js; scripts/site-builder-quality-audit.mjs; services/site-builder.js | runtime proof receipt |
| Site builder prospect ranker | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Site builder email templates | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Prospect pipeline | PARTIAL | Y | Y | Y | Y | partial | routes/site-builder-routes.js; scripts/site-builder-follow-up-cron.mjs; scripts/autonomy/builder-queue.json | runtime proof receipt |
| Preview expiry cron | PARTIAL | Y | Y | Y | Y | partial | server.js; scripts/site-builder-preview-expiry-cron.mjs | runtime proof receipt |
| Outreach CRM | ACTIVE | Y | Y | Y | Y | partial | server.js; scripts/extract-routes.py; core/two-tier-system-init.js |  |
| Email reader + triage | PARTIAL | Y | Y | Y | N | N | core/signup-agent.js; services/tc-email-monitor.js | runtime proof receipt |
| Marketing routes | BUILT BUT DISCONNECTED | Y | N | N | Y | partial | — | startup/register-runtime-routes.js; core/two-tier-system-init.js |
| Marketing content engine | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Marketing coach | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Marketing transcriber | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Web intelligence | ACTIVE | Y | Y | Y | Y | partial | server.js; scripts/extract-routes.py; core/two-tier-system-init.js |  |
| Web search integration | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Website audit | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/autonomy/proof-report.md |  |
| Financial routes | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| Email provision (Postmark) | MISSING | N | N | N | N | N | — |  |
| Browser agent core | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/mls-routes.js; core/signup-agent.js | runtime proof receipt |
| TC browser agent | PARTIAL | Y | Y | Y | N | N | startup/boot-domains.js; routes/mls-routes.js; services/tc-listing-skyslope-sync.js | runtime proof receipt |
| ClientCare browser service | PARTIAL | Y | Y | Y | N | N | routes/clientcare-billing-routes.js | runtime proof receipt |
| Web search integration | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Web search service | PARTIAL | Y | Y | Y | N | N | routes/idea-queue-routes.js; core/auto-builder.js; services/lane-intel-service.js | runtime proof receipt |
| Website audit routes | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; scripts/autonomy/proof-report.md |  |
| Web intelligence | ACTIVE | Y | Y | Y | Y | partial | server.js; scripts/extract-routes.py; core/two-tier-system-init.js |  |
| Research aggregator | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-ethics-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Funnel analyzer | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Document processor | MISSING | N | N | N | N | N | — |  |
| PDF signature stamp | PARTIAL | Y | Y | Y | N | N | services/tc-inspection-forward-service.js | runtime proof receipt |
| Old self-programming path | LEGACY | Y | Y | Y | Y | partial | server.js; core/log-monitor.js; core/two-tier-system-init.js |  |
| Old self-improvement loop | LEGACY | Y | Y | Y | N | N | server.js |  |
| Orphan routes (CJS in ESM, not imported) | LEGACY | N | N | N | N | N | — |  |
| Autonomous efficiency intelligence | LEGACY | Y | Y | Y | N | N | routes/autonomous-telemetry-routes.js; services/autonomous-telemetry-session.js |  |
| ChatGPT import | LEGACY | Y | Y | Y | Y | partial | routes/lifeos-core-routes.js; scripts/lifeos-verify.mjs |  |
| Logger (Pino) | PARTIAL | Y | Y | Y | Y | partial | server.js; startup/environment.js; startup/roi.js | runtime proof receipt |
| Adam logger | PARTIAL | Y | Y | Y | N | N | server.js; routes/twin-routes.js; services/twin-auto-ingest.js | runtime proof receipt |
| Telemetry | PARTIAL | Y | Y | Y | Y | partial | package.json; server.js; startup/routes/server-routes.js | runtime proof receipt |
| DB connection pool | PARTIAL | Y | Y | Y | Y | partial | package.json; server.js; startup/routes/server-routes.js | runtime proof receipt |
| DB health monitor | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Migration runner | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| Env validator | PARTIAL | Y | Y | Y | N | N | server.js; services/ConfigService.js | runtime proof receipt |
| Env registry map | PARTIAL | Y | Y | Y | N | N | routes/site-builder-routes.js; routes/site-builder-launch-readiness-routes.js; routes/railway-managed-env-routes.js | runtime proof receipt |
| Response cache | PARTIAL | Y | Y | Y | N | N | server.js; startup/register-runtime-routes.js; services/council-service.js | runtime proof receipt |
| Queue (BullMQ) | PARTIAL | Y | Y | Y | Y | partial | server.js; package.json; startup/routes/server-routes.js | runtime proof receipt |
| Execution queue | PARTIAL | Y | Y | Y | N | N | server.js; core/two-tier-system-init.js; services/learning-engine/task_queue_connector.py | runtime proof receipt |
| Request tracer middleware | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Error boundary middleware | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Websocket handler | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Twilio service | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Twilio webhook registrar | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Council service | PARTIAL | Y | Y | Y | Y | partial | server.js; services/lcl-monitor.js; services/prompt-translator.js | runtime proof receipt |
| Consensus service | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Council prompt adapter | PARTIAL | Y | Y | Y | Y | partial | startup/register-runtime-routes.js; routes/lifeos-health-routes.js; routes/lifeos-communication-routes.js | runtime proof receipt |
| AI model service | MISSING | N | N | N | N | N | — |  |
| AI performance tracker | PARTIAL | Y | Y | Y | N | N | server.js | runtime proof receipt |
| Rules engine | PARTIAL | Y | Y | Y | N | N | services/council-service.js | runtime proof receipt |
| Risk scorer | PARTIAL | Y | Y | Y | N | N | routes/autonomy-routes.js; services/autonomy-orchestrator.js | runtime proof receipt |
| Continuous improvement | PARTIAL | Y | Y | Y | N | N | server.js; routes/twin-routes.js | runtime proof receipt |
| Outcome tracker | PARTIAL | Y | Y | Y | N | N | routes/twin-routes.js | runtime proof receipt |
| Decision ledger | PARTIAL | Y | Y | Y | N | N | services/founder-value-engine.js; services/builderos-model-escalation-gate.js | runtime proof receipt |
| Communication gateway | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-engine-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Prompt IR | PARTIAL | Y | Y | Y | N | N | services/council-service.js | runtime proof receipt |
| Prompt translator | PARTIAL | Y | Y | Y | N | N | services/council-service.js | runtime proof receipt |
| Tools status | BUILT BUT DISCONNECTED | Y | N | N | N | N | — | production spine mount |
| UX evaluator | PARTIAL | Y | Y | Y | N | N | services/design-quality-gate.js | runtime proof receipt |
| Design quality gate | PARTIAL | Y | Y | Y | N | N | routes/idea-queue-routes.js; core/auto-builder.js | runtime proof receipt |
| Notification router (LifeOS) | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-core-routes.js; scripts/lifeos-verify.mjs; services/lifeos-scheduled-jobs.js | runtime proof receipt |
| Community growth | PARTIAL | Y | Y | Y | Y | partial | routes/lifeos-legacy-routes.js; scripts/lifeos-verify.mjs | runtime proof receipt |
| Credential aliases | PARTIAL | Y | Y | Y | N | N | services/tc-imap-config.js; services/tc-access-service.js; services/tc-browser-agent.js | runtime proof receipt |
| Video pipeline | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| Game publisher | ACTIVE | Y | Y | Y | Y | partial | server.js; scripts/extract-routes.py; core/two-tier-system-init.js |  |
| Knowledge context | ACTIVE | Y | Y | Y | Y | partial | server.js; core/two-tier-system-init.js; scripts/extract-routes.py |  |
| Idea queue | ACTIVE | Y | Y | Y | Y | partial | startup/register-runtime-routes.js |  |
| Teacher OS | ACTIVE | Y | Y | Y | N | N | startup/register-runtime-routes.js |  |

## Appendix B — Evidence index

| Evidence type | Location |
|---------------|----------|
| Route spine | `startup/register-runtime-routes.js`, `core/two-tier-system-init.js`, `startup/routes/server-routes.js` |
| Boot schedulers | `startup/boot-domains.js` |
| Product receipts | `products/receipts/*.json` |
| Acceptance scripts | `package.json` `lifeos:*`, `factory:*`, `builderos:*` |
| Factory runtime | `factory-staging/startup/register-routes.js` |
| Hist boundary | `prompts/00-HIST-LEGACY-BOUNDARY.md`, `builderos-reboot/HIST_DOMAIN_REGISTRY.json` |

---

*Phase 2: re-run this audit when mount map changes; update `docs/SYSTEM_CAPABILITY_INVENTORY.md` classifications to match truth labels (ACTIVE/PARTIAL/DISCONNECTED), not disk-only PRESENT.*
