# SYSTEM CAPABILITY TRUTH AUDIT V1

**Status:** `AUTHORITATIVE AUDIT` (repo-truth; not runtime law)  
**Produced:** 2026-06-13 — read-only audit; **no runtime code modified**  
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
4. Verified **Has consumer** via import/reference in production spine corpus.
5. Verified **Has tests** via `tests/`, `scripts/*verify*`, `scripts/*proof*`, `scripts/*acceptance*`, or `package.json` script name match.
6. Verified **Runtime proof** via receipt in `products/receipts/`, acceptance script, or live proof script reference only (not assumed from docs).
7. Applied **manual overrides** for known spine facts (e.g. two-tier init mounts site-builder; sleep routes regression; DONE gate helper wired in council builder).
8. **Confidence:** HIGH = ACTIVE + tests/proof; MEDIUM = ACTIVE/PARTIAL with consumer; LOW = disconnected/missing/legacy.

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

| Capability | Status | Exists | Mounted | Consumer | Tests | Runtime proof | Primary artifact | Confidence |
|------------|--------|--------|---------|----------|-------|---------------|------------------|------------|
| Builder supervisor / task runner | ACTIVE | Y | Y | Y | Y | Y | routes/builder-supervisor-routes.js | HIGH |
| Builder preflight gate | PARTIAL | Y | Y | Y | Y | Y | scripts/council-builder-preflight.mjs | MEDIUM |
| Builder council review | PARTIAL | Y | Y | Y | Y | Y | services/builder-council-review.js | MEDIUM |
| Build audit before done | PARTIAL | Y | Y | Y | Y | Y | services/builder-audit-before-done.js | MEDIUM |
| Build critic | PARTIAL | Y | Y | Y | N | N | services/build-critic.js | MEDIUM |
| Outcome verifier | PARTIAL | Y | Y | Y | Y | Y | services/builder-outcome-verifier.js | MEDIUM |
| Blueprint gate | PARTIAL | Y | Y | Y | Y | Y | services/builder-blueprint-gate.js | MEDIUM |
| Instruction target resolver | PARTIAL | Y | Y | Y | Y | Y | services/builder-instruction-target.js | MEDIUM |
| Build pipeline | PARTIAL | Y | Y | Y | N | N | services/builderos-build-pipeline.js | MEDIUM |
| Governed loop executor | PARTIAL | Y | Y | Y | Y | Y | services/builderos-governed-loop-executor.js | MEDIUM |
| Patch mode policy | PARTIAL | Y | Y | Y | N | N | services/builderos-patch-mode-policy.js | MEDIUM |
| Routing policy | PARTIAL | Y | Y | Y | N | N | services/builderos-routing-policy.js | MEDIUM |
| Structural proof | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/builderos-structural-proof.js | LOW |
| Metrics reporter | PARTIAL | Y | Y | Y | N | N | services/builderos-metrics-reporter.js | MEDIUM |
| Control plane | ACTIVE | Y | Y | Y | Y | Y | routes/builderos-control-plane-routes.js | HIGH |
| Command + control service | PARTIAL | Y | Y | Y | Y | Y | services/builderos-command-control-service.js | MEDIUM |
| Alpha readiness guards | PARTIAL | Y | Y | Y | N | N | services/builderos-system-alpha-readiness.js | MEDIUM |
| Oil job audit | PARTIAL | Y | Y | Y | N | N | services/builderos-oil-job-audit.js | MEDIUM |
| Governed proof parity | PARTIAL | Y | Y | Y | Y | Y | services/builderos-governed-proof-parity.js | MEDIUM |
| Live enforcement pass | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/builderos-live-enforcement-pass.js | LOW |
| TSOS evidence | PARTIAL | Y | Y | Y | N | N | services/builderos-tsos-evidence.js | MEDIUM |
| TSOS hook service | PARTIAL | Y | Y | Y | N | N | services/builderos-tsos-hook-service.js | MEDIUM |
| Pre-commit governance | PARTIAL | Y | Y | Y | N | N | services/builderos-precommit-governance.js | MEDIUM |
| Phase14 ledger | PARTIAL | Y | Y | Y | Y | Y | services/builder-phase14-ledger.js | MEDIUM |
| BP priority queue | PARTIAL | Y | Y | Y | Y | Y | services/bp-priority-queue.js | MEDIUM |
| Oil probe (Phase 7) | ACTIVE | Y | Y | Y | Y | Y | routes/builder-oil-audit-probe-routes.js | HIGH |
| Factory autopilot scheduler | PARTIAL | Y | Y | Y | N | N | services/factory-autopilot-scheduler.js | MEDIUM |
| Factory recovery proof | PARTIAL | Y | Y | Y | N | N | services/factory-recovery-proof-service.js | MEDIUM |
| Continuous queue (shadow queue) | REJECT | Y | Y | Y | Y | Y | scripts/lifeos-builder-continuous-queue.mjs | LOW |
| Product development gate | MISSING | N | N | N | N | N | — | LOW |
| Founder packet completeness checker | PARTIAL | N | N | N | N | Y | — | MEDIUM |
| Determinism checker at Builder tier | PARTIAL | N | N | N | N | N | — | MEDIUM |
| Command center aggregate | ACTIVE | Y | Y | Y | Y | Y | routes/lifeos-command-center-routes.js | HIGH |
| Supervised autonomy readiness | PARTIAL | Y | Y | Y | N | N | services/supervised-autonomy-readiness.js | MEDIUM |
| PB execution authority | PARTIAL | Y | Y | Y | N | N | services/pb-execution-authority.js | MEDIUM |
| Proof freshness | PARTIAL | Y | Y | Y | Y | Y | services/oil-proof-freshness.js | MEDIUM |
| Phase 14 cert | MISSING | N | N | N | N | N | — | LOW |
| Canonical admin routes | ACTIVE | Y | Y | Y | N | N | routes/canonical-admin-routes.js | MEDIUM |
| Canonical system routes | ACTIVE | Y | Y | Y | N | N | routes/canonical-system-routes.js | MEDIUM |
| Canonical execution routes | ACTIVE | Y | Y | Y | N | N | routes/canonical-execution-routes.js | MEDIUM |
| Canonical backlog | ACTIVE | Y | Y | Y | N | N | routes/canonical-backlog-routes.js | MEDIUM |
| Autonomous telemetry | ACTIVE | Y | Y | Y | Y | Y | routes/autonomous-telemetry-routes.js | HIGH |
| Capability map | ACTIVE | Y | Y | Y | N | Y | routes/capability-map-routes.js | MEDIUM |
| Mission ledger | PARTIAL | Y | Y | Y | N | N | services/mission-ledger.js | MEDIUM |
| Deliberation governance | ACTIVE | Y | Y | Y | Y | Y | routes/deliberation-governance-routes.js | HIGH |
| Gate change council runner | ACTIVE | Y | Y | Y | Y | Y | routes/lifeos-gate-change-routes.js | HIGH |
| Founder debrief | PARTIAL | Y | Y | Y | N | Y | services/founder-debrief-service.js | MEDIUM |
| Founder value engine | PARTIAL | Y | Y | Y | Y | Y | services/founder-value-engine.js | MEDIUM |
| Founder direct provider | PARTIAL | Y | Y | Y | Y | Y | services/founder-direct-provider.js | MEDIUM |
| Lane intel | ACTIVE | Y | Y | Y | Y | Y | routes/lane-intel-routes.js | HIGH |
| TSOS efficiency | ACTIVE | Y | Y | Y | N | N | routes/tsos-efficiency-routes.js | MEDIUM |
| TSOS platform kernel | ACTIVE | Y | Y | Y | Y | Y | routes/tsos-platform-kernel-routes.js | HIGH |
| Telemetry cycle guard | PARTIAL | Y | Y | Y | N | N | services/telemetry-cycle-guard.js | MEDIUM |
| Constitutional lock | PARTIAL | Y | Y | Y | Y | Y | services/constitutional-lock.js | MEDIUM |
| Kingsman gate | PARTIAL | Y | Y | Y | N | N | services/kingsman-gate.js | MEDIUM |
| Sovereignty check | PARTIAL | Y | Y | Y | Y | Y | services/sovereignty-check.js | MEDIUM |
| OIL security receipts | ACTIVE | Y | Y | Y | Y | Y | routes/oil-security-receipt-routes.js | HIGH |
| Self-repair executor | ACTIVE | Y | Y | Y | Y | Y | routes/self-repair-executor-routes.js | HIGH |
| Agent recruitment routes | ACTIVE | Y | Y | Y | Y | Y | routes/agent-recruitment-routes.js | HIGH |
| Runtime mode controller | PARTIAL | Y | Y | Y | Y | Y | services/runtime-modes.js | MEDIUM |
| Useful work guard | PARTIAL | Y | Y | Y | Y | Y | services/useful-work-guard.js | MEDIUM |
| Metered AI call | PARTIAL | Y | Y | Y | Y | Y | services/metered-ai-call.js | MEDIUM |
| Core engine + gateway | MISSING | N | Y | Y | Y | Y | lifeos-engine-routes.js | LOW |
| Auth (user registration, login) | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-auth.js | MEDIUM |
| Daily briefing | PARTIAL | Y | Y | Y | N | N | services/lifeos-daily-briefing.js | MEDIUM |
| Habits + streaks | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-habits.js | MEDIUM |
| Commitments | PARTIAL | Y | Y | Y | N | Y | services/lifeos-commitment-tracker.js | MEDIUM |
| Emotional layer | PARTIAL | Y | Y | Y | Y | Y | services/emotional-pattern-engine.js | MEDIUM |
| Health | PARTIAL | Y | Y | Y | Y | Y | services/health-pattern-engine.js | MEDIUM |
| Family sync | PARTIAL | Y | Y | Y | Y | Y | services/household-sync.js | MEDIUM |
| Purpose discovery | PARTIAL | Y | Y | Y | Y | Y | services/purpose-discovery.js | MEDIUM |
| Decisions | PARTIAL | Y | Y | Y | Y | Y | services/decision-intelligence.js | MEDIUM |
| Identity intelligence | MISSING | N | Y | Y | Y | Y | lifeos-identity-routes.js | LOW |
| Vision / Future Self | PARTIAL | Y | Y | Y | N | N | services/future-self-simulator.js | MEDIUM |
| Finance OS | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-finance.js | MEDIUM |
| Conflict coach | PARTIAL | Y | Y | Y | Y | Y | services/conflict-intelligence.js | MEDIUM |
| Mediation engine | PARTIAL | Y | Y | Y | Y | Y | services/mediation-engine.js | MEDIUM |
| Healing | MISSING | N | Y | Y | Y | Y | lifeos-healing-routes.js | LOW |
| Legacy builder | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-legacy-core.js | MEDIUM |
| Ethics | MISSING | N | Y | Y | Y | Y | lifeos-ethics-routes.js | LOW |
| Growth + mastery | PARTIAL | Y | Y | Y | Y | Y | services/mastery-tracker.js | MEDIUM |
| Scorecard / scoreboard | PARTIAL | Y | Y | Y | N | N | services/lifeos-daily-scorecard.js | MEDIUM |
| Victory vault | PARTIAL | Y | Y | Y | Y | Y | services/victory-vault.js | MEDIUM |
| Weekly review | PARTIAL | Y | Y | Y | N | N | services/lifeos-weekly-review.js | MEDIUM |
| Assessment battery | PARTIAL | Y | Y | Y | N | N | services/lifeos-assessment-battery.js | MEDIUM |
| Children (Kids OS) | PARTIAL | Y | Y | Y | N | N | services/kids-os-core.js | MEDIUM |
| Communication OS | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-communication-os-service.js | MEDIUM |
| Calendar integration | PARTIAL | Y | Y | Y | N | N | services/lifeos-calendar.js | MEDIUM |
| Ambient intelligence | PARTIAL | Y | Y | Y | N | N | services/lifeos-ambient-intelligence.js | MEDIUM |
| Cycle tracking | PARTIAL | Y | Y | Y | N | N | services/lifeos-cycle.js | MEDIUM |
| Sleep | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | services/lifeos-sleep-service.js | LOW |
| Backtest | MISSING | N | Y | Y | N | N | lifeos-backtest-routes.js | LOW |
| Extension points | MISSING | N | Y | Y | N | N | lifeos-extension-routes.js | LOW |
| Council builder | MISSING | N | Y | Y | Y | Y | lifeos-council-builder-routes.js | LOW |
| LifeOS direct action | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-direct-action.js | MEDIUM |
| System proof | PARTIAL | Y | Y | Y | N | Y | services/lifeos-system-proof-event.js | MEDIUM |
| System agent | PARTIAL | Y | Y | Y | N | Y | services/lifeos-system-agent.js | MEDIUM |
| LifeOS chat | MISSING | N | Y | Y | Y | Y | lifeos-chat-routes.js | LOW |
| Lumin AI persona | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-lumin.js | MEDIUM |
| Wearable integration | PARTIAL | N | N | N | N | N | — | MEDIUM |
| Conflict interrupt | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | services/lifeos-conflict-interrupt.js | LOW |
| Decision review | BUILT BUT DISCONNECTED | Y | Y | Y | N | N | services/lifeos-decision-review.js | LOW |
| Workshop of mind | ACTIVE | Y | Y | Y | N | N | routes/lifeos-workshop-routes.js | MEDIUM |
| Copilot | ACTIVE | Y | Y | Y | N | N | routes/lifeos-copilot-routes.js | MEDIUM |
| Simulator | ACTIVE | Y | Y | Y | N | N | routes/lifeos-simulator-routes.js | MEDIUM |
| Emergency detection | PARTIAL | Y | Y | Y | Y | Y | services/emergency-detection.js | MEDIUM |
| Self-sabotage monitor | PARTIAL | Y | Y | Y | N | N | services/self-sabotage-monitor.js | MEDIUM |
| User auth (multi-user) | PARTIAL | N | N | N | N | N | — | MEDIUM |
| Voice Rail v1 core | PARTIAL | Y | Y | Y | Y | Y | services/voice-rail-v1.js | MEDIUM |
| STT (speech-to-text) | PARTIAL | Y | Y | Y | N | N | services/voice-rail-stt.js | MEDIUM |
| TTS (text-to-speech) | PARTIAL | Y | Y | Y | N | N | services/voice-rail-tts.js | MEDIUM |
| Intent router | PARTIAL | Y | Y | Y | N | N | services/voice-rail-intent-router.js | MEDIUM |
| Command executor | PARTIAL | Y | Y | Y | N | N | services/voice-rail-command-executor.js | MEDIUM |
| System direct path | PARTIAL | Y | Y | Y | N | Y | services/voice-rail-system-direct.js | MEDIUM |
| System operator path | PARTIAL | Y | Y | Y | N | Y | services/voice-rail-system-operator.js | MEDIUM |
| Founder memory integration | PARTIAL | Y | Y | Y | N | Y | services/voice-rail-founder-memory.js | MEDIUM |
| Execution truth receipts | PARTIAL | Y | Y | Y | Y | Y | services/voice-rail-execution-truth.js | MEDIUM |
| Usage receipt | PARTIAL | Y | Y | Y | N | N | services/voice-rail-usage-receipt.js | MEDIUM |
| Attachment handling | PARTIAL | Y | Y | Y | N | N | services/voice-rail-attachments.js | MEDIUM |
| Provider proof hard-route | PARTIAL | Y | Y | Y | N | Y | services/founder-provider-tool-action.js | MEDIUM |
| Action Inbox | ACTIVE | Y | Y | Y | Y | Y | routes/action-inbox-routes.js | HIGH |
| Native mobile mic (iOS/Android) | MISSING | N | N | N | N | N | — | LOW |
| Conversation history | ACTIVE | Y | Y | Y | N | Y | routes/conversation-history-routes.js | MEDIUM |
| Memory intelligence | ACTIVE | Y | Y | Y | N | N | routes/memory-intelligence-routes.js | MEDIUM |
| Memory capsule | ACTIVE | Y | Y | Y | Y | Y | routes/memory-capsule-routes.js | HIGH |
| Working memory | PARTIAL | Y | Y | Y | N | N | services/memory-working.js | MEDIUM |
| Institutional memory | PARTIAL | Y | Y | Y | Y | Y | services/memory-institutional.js | MEDIUM |
| Memory relationship graph | PARTIAL | Y | Y | Y | Y | Y | services/memory-relationship.js | MEDIUM |
| Memory links | PARTIAL | Y | Y | Y | Y | Y | services/memory-links.js | MEDIUM |
| Memory provenance | PARTIAL | Y | Y | Y | Y | Y | services/memory-provenance.js | MEDIUM |
| Memory trust bridge | PARTIAL | Y | Y | Y | Y | Y | services/memory-trust-bridge.js | MEDIUM |
| Memory healing | PARTIAL | Y | Y | Y | Y | Y | services/memory-healing.js | MEDIUM |
| Memory health | PARTIAL | Y | Y | Y | N | N | services/memory-health.js | MEDIUM |
| Memory explanation | PARTIAL | Y | Y | Y | Y | Y | services/memory-explanation.js | MEDIUM |
| Memory receipts | PARTIAL | Y | Y | Y | Y | Y | services/memory-receipts.js | MEDIUM |
| Memory signal intake | PARTIAL | Y | Y | Y | Y | Y | services/memory-signal-intake.js | MEDIUM |
| Memory contradiction | PARTIAL | Y | Y | Y | Y | Y | services/memory-contradiction.js | MEDIUM |
| Memory zombie (stale detection) | PARTIAL | Y | Y | Y | Y | Y | services/memory-zombie.js | MEDIUM |
| Memory OIL bridge | PARTIAL | Y | Y | Y | Y | Y | services/memory-oil-bridge.js | MEDIUM |
| Memory legacy bridge | PARTIAL | Y | Y | Y | Y | Y | services/memory-legacy-bridge.js | MEDIUM |
| Memory candidate | PARTIAL | Y | Y | Y | Y | Y | services/memory-candidate.js | MEDIUM |
| Self-repair memory | PARTIAL | Y | Y | Y | N | N | services/self-repair-memory.js | MEDIUM |
| Lumin memory fetcher | PARTIAL | Y | Y | Y | Y | Y | services/lumin-memory-fetcher.js | MEDIUM |
| Delta context | PARTIAL | Y | Y | Y | N | N | services/delta-context.js | MEDIUM |
| Memory status routes | ACTIVE | Y | Y | Y | N | N | routes/memory-status-routes.js | MEDIUM |
| Memory self-repair routes | ACTIVE | Y | Y | Y | N | N | routes/memory-self-repair-routes.js | MEDIUM |
| Historian canonical contract (NSSOT §2.0I) | PARTIAL | N | N | N | N | N | — | MEDIUM |
| OIL security receipts | PARTIAL | Y | Y | Y | Y | Y | services/oil-security-receipts.js | MEDIUM |
| OIL daily summary | PARTIAL | Y | Y | Y | N | N | services/oil-daily-summary.js | MEDIUM |
| OIL proof freshness | PARTIAL | Y | Y | Y | Y | Y | services/oil-proof-freshness.js | MEDIUM |
| OIL self-repair detector | PARTIAL | Y | Y | Y | Y | Y | services/oil-self-repair-detector.js | MEDIUM |
| Self-repair executor | PARTIAL | Y | Y | Y | Y | Y | services/self-repair-executor.js | MEDIUM |
| Self-repair deploy scheduler | PARTIAL | Y | Y | Y | N | N | services/self-repair-deploy-scheduler.js | MEDIUM |
| Self-repair lesson classifier | PARTIAL | Y | Y | Y | N | N | services/self-repair-lesson-classifier.js | MEDIUM |
| Self-repair execution log | PARTIAL | Y | Y | Y | N | N | services/self-repair-execution-log.js | MEDIUM |
| Self-repair prevention hook log | PARTIAL | Y | Y | Y | N | N | services/self-repair-prevention-hook-log.js | MEDIUM |
| Self-repair prevention hook planner | PARTIAL | Y | Y | Y | N | N | services/self-repair-prevention-hook-planner.js | MEDIUM |
| Self-repair prevention registry | PARTIAL | Y | Y | Y | N | N | services/self-repair-prevention-registry.js | MEDIUM |
| Emergency repair | PARTIAL | Y | Y | Y | N | N | services/emergency-repair.js | MEDIUM |
| Gemini proof routes | ACTIVE | Y | Y | Y | N | N | routes/gemini-proof-routes.js | MEDIUM |
| System proof event | PARTIAL | Y | Y | Y | N | Y | services/lifeos-system-proof-event.js | MEDIUM |
| Integrity engine | PARTIAL | Y | Y | Y | N | N | services/integrity-engine.js | MEDIUM |
| Integrity score | PARTIAL | Y | Y | Y | Y | Y | services/integrity-score.js | MEDIUM |
| Council bypass audit | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/council-bypass-audit.js | LOW |
| Contradiction engine | PARTIAL | Y | Y | Y | Y | Y | services/contradiction-engine.js | MEDIUM |
| Blind spot detector | MISSING | N | N | N | N | N | — | LOW |
| AI guard | PARTIAL | Y | Y | Y | N | Y | services/ai-guard.js | MEDIUM |
| Anomaly detection | MISSING | N | N | N | N | N | — | LOW |
| Truth delivery | PARTIAL | Y | Y | Y | Y | Y | services/truth-delivery.js | MEDIUM |
| Response variety | PARTIAL | Y | Y | Y | Y | Y | services/response-variety.js | MEDIUM |
| Fraud detection | PARTIAL | N | N | N | N | N | — | MEDIUM |
| Consent registry | PARTIAL | Y | Y | Y | Y | Y | services/consent-registry.js | MEDIUM |
| Data sovereignty | PARTIAL | Y | Y | Y | Y | Y | services/data-sovereignty.js | MEDIUM |
| API cost savings | ACTIVE | Y | Y | Y | Y | Y | routes/api-cost-savings-routes.js | HIGH |
| TokenOS core | ACTIVE | Y | Y | Y | N | N | routes/tokenos-routes.js | MEDIUM |
| Token accounting | ACTIVE | Y | Y | Y | Y | Y | routes/token-accounting-routes.js | HIGH |
| Operator consumption ledger | ACTIVE | Y | Y | Y | Y | Y | routes/operator-consumption-ledger-routes.js | HIGH |
| Token optimizer | PARTIAL | Y | Y | Y | N | N | services/token-optimizer.js | MEDIUM |
| TSOS task ledger | BUILT BUT DISCONNECTED | Y | N | Y | Y | Y | routes/tsos-task-ledger-routes.js | LOW |
| TCO agent routes | ACTIVE | Y | Y | Y | N | N | routes/tco-agent-routes.js | MEDIUM |
| TCO routes | ACTIVE | Y | Y | Y | Y | Y | routes/tco-routes.js | HIGH |
| TSOS platform kernel | ACTIVE | Y | Y | Y | Y | Y | routes/tsos-platform-kernel-routes.js | HIGH |
| TSOS efficiency | ACTIVE | Y | Y | Y | N | N | routes/tsos-efficiency-routes.js | MEDIUM |
| Model performance tracking | ACTIVE | Y | Y | Y | Y | Y | routes/model-performance-routes.js | HIGH |
| Response cache | PARTIAL | Y | Y | Y | N | N | services/response-cache.js | MEDIUM |
| Free tier governor | PARTIAL | Y | Y | Y | N | N | services/free-tier-governor.js | MEDIUM |
| Savings ledger | PARTIAL | Y | Y | Y | N | N | services/savings-ledger.js | MEDIUM |
| AI model selector | PARTIAL | Y | Y | Y | N | Y | services/ai-model-selector.js | MEDIUM |
| Adaptive model routing | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/adaptiveModel.js | LOW |
| TokenOS quality check | PARTIAL | Y | Y | Y | N | N | services/tokenos-quality-check.js | MEDIUM |
| Monetization map | PARTIAL | Y | Y | Y | N | N | services/monetization-map.js | MEDIUM |
| Deployment service (git + Railway) | PARTIAL | Y | Y | Y | Y | Y | services/deployment-service.js | MEDIUM |
| Railway managed env routes | ACTIVE | Y | Y | Y | Y | Y | routes/railway-managed-env-routes.js | HIGH |
| Env validator (boot-time) | PARTIAL | Y | Y | Y | N | N | services/env-validator.js | MEDIUM |
| Env registry map | PARTIAL | Y | Y | Y | N | N | services/env-registry-map.js | MEDIUM |
| Migration runner | PARTIAL | Y | Y | Y | N | N | services/migration-runner.js | MEDIUM |
| DB health monitor | PARTIAL | Y | Y | Y | N | N | services/db-health-monitor.js | MEDIUM |
| Project governance routes | ACTIVE | Y | Y | Y | Y | Y | routes/project-governance-routes.js | HIGH |
| SSOT check script | PARTIAL | Y | Y | Y | Y | Y | scripts/ssot-check.js | MEDIUM |
| Pre-commit hooks | MISSING | N | N | N | N | N | — | LOW |
| Coupling check | PARTIAL | Y | Y | Y | Y | Y | scripts/check-coupling.mjs | MEDIUM |
| Snapshot service | PARTIAL | Y | Y | Y | Y | Y | services/snapshot-service.js | MEDIUM |
| Sandbox service | PARTIAL | Y | Y | Y | Y | Y | services/sandbox-service.js | MEDIUM |
| Account manager | ACTIVE | Y | Y | Y | N | N | routes/account-manager-routes.js | MEDIUM |
| Stripe integration | ACTIVE | Y | Y | Y | Y | Y | routes/stripe-routes.js | HIGH |
| Billing routes | ACTIVE | Y | Y | Y | Y | Y | routes/billing-routes.js | HIGH |
| Auto-builder routes | ACTIVE | Y | Y | Y | Y | Y | routes/auto-builder-routes.js | HIGH |
| TC core routes | ACTIVE | Y | Y | Y | Y | Y | routes/tc-routes.js | HIGH |
| MLS routes | ACTIVE | Y | Y | Y | N | N | routes/mls-routes.js | MEDIUM |
| TC assistant service | PARTIAL | Y | Y | Y | N | N | services/tc-assistant-service.js | MEDIUM |
| TC workflow runner | PARTIAL | Y | Y | Y | N | N | services/tc-td-workflow-runner.js | MEDIUM |
| TC status engine | PARTIAL | Y | Y | Y | N | N | services/tc-status-engine.js | MEDIUM |
| TC email monitor + intake | PARTIAL | Y | Y | Y | N | N | services/tc-email-monitor.js | MEDIUM |
| TC document validator | PARTIAL | Y | Y | Y | N | N | services/tc-document-validator.js | MEDIUM |
| TC browser agent | PARTIAL | Y | Y | Y | N | N | services/tc-browser-agent.js | MEDIUM |
| TC inspection service | PARTIAL | Y | Y | Y | N | N | services/tc-inspection-service.js | MEDIUM |
| TC offer prep | PARTIAL | Y | Y | Y | N | N | services/tc-offer-prep-service.js | MEDIUM |
| TC morning digest | BUILT BUT DISCONNECTED | Y | N | N | Y | Y | services/tc-morning-digest-service.js | LOW |
| TC coordinator | PARTIAL | Y | Y | Y | N | N | services/tc-coordinator.js | MEDIUM |
| TC Asana sync | PARTIAL | Y | Y | Y | N | N | services/tc-asana-sync-service.js | MEDIUM |
| TC alert service | PARTIAL | Y | Y | Y | N | N | services/tc-alert-service.js | MEDIUM |
| TC portal | PARTIAL | Y | Y | Y | N | N | services/tc-portal-service.js | MEDIUM |
| TC Stripe | PARTIAL | Y | Y | Y | N | N | services/tc-stripe-service.js | MEDIUM |
| TC pricing | PARTIAL | Y | Y | Y | N | N | services/tc-pricing.js | MEDIUM |
| TC R4R attachment classify | PARTIAL | Y | Y | Y | Y | Y | services/tc-r4r-attachment-classify.js | MEDIUM |
| TC report service | PARTIAL | Y | Y | Y | N | N | services/tc-report-service.js | MEDIUM |
| TC review package | PARTIAL | Y | Y | Y | N | N | services/tc-review-package-service.js | MEDIUM |
| TC SkySlope listing sync | PARTIAL | Y | Y | Y | N | N | services/tc-listing-skyslope-sync.js | MEDIUM |
| TC mobile link | PARTIAL | Y | Y | Y | N | N | services/tc-mobile-link-service.js | MEDIUM |
| TC TD party sync | PARTIAL | Y | Y | Y | N | N | services/tc-td-party-sync.js | MEDIUM |
| TC form knowledge | PARTIAL | Y | Y | Y | N | N | services/tc-td-form-knowledge-service.js | MEDIUM |
| BoldTrail real estate | PARTIAL | Y | Y | Y | Y | Y | routes/boldtrail-routes.js | MEDIUM |
| MLS deal scanner | PARTIAL | Y | Y | Y | N | N | services/mls-deal-scanner.js | MEDIUM |
| GLVAR monitor | PARTIAL | Y | Y | Y | N | N | services/glvar-monitor.js | MEDIUM |
| ClientCare billing | ACTIVE | Y | Y | Y | Y | Y | routes/clientcare-billing-routes.js | HIGH |
| ClientCare browser service | PARTIAL | Y | Y | Y | N | N | services/clientcare-browser-service.js | MEDIUM |
| Life coaching / Twin | ACTIVE | Y | Y | Y | Y | Y | routes/life-coaching-routes.js | HIGH |
| Word Keeper | ACTIVE | Y | Y | Y | N | N | routes/word-keeper-routes.js | MEDIUM |
| Word Keeper transcriber | PARTIAL | Y | Y | Y | N | N | services/word-keeper-transcriber.js | MEDIUM |
| Site builder core | ACTIVE | Y | Y | Y | Y | Y | routes/site-builder-routes.js | HIGH |
| Site builder discovery | ACTIVE | Y | Y | Y | N | N | routes/site-builder-discovery-routes.js | MEDIUM |
| Site builder launch readiness | ACTIVE | Y | N | N | N | N | routes/site-builder-launch-readiness-routes.js | MEDIUM |
| Site builder pipeline report | ACTIVE | Y | Y | Y | Y | Y | routes/site-builder-pipeline-report-routes.js | HIGH |
| Site builder revenue | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/site-builder-revenue-service.js | LOW |
| Site builder opportunity scorer | PARTIAL | Y | Y | Y | Y | Y | services/site-builder-opportunity-scorer.js | MEDIUM |
| Site builder quality scorer | PARTIAL | Y | Y | Y | Y | Y | services/site-builder-quality-scorer.js | MEDIUM |
| Site builder prospect ranker | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/site-builder-prospect-ranker.js | LOW |
| Site builder email templates | PARTIAL | Y | Y | Y | N | N | services/site-builder-email-templates.js | MEDIUM |
| Prospect pipeline | PARTIAL | Y | Y | Y | Y | Y | services/prospect-pipeline.js | MEDIUM |
| Preview expiry cron | PARTIAL | Y | Y | Y | Y | Y | services/preview-expiry-cron.js | MEDIUM |
| Outreach CRM | ACTIVE | Y | Y | Y | Y | Y | routes/outreach-crm-routes.js | HIGH |
| Email reader + triage | PARTIAL | Y | Y | Y | N | N | services/email-reader.js | MEDIUM |
| Marketing routes | BUILT BUT DISCONNECTED | Y | N | N | Y | Y | routes/marketing-routes.js | LOW |
| Marketing content engine | PARTIAL | Y | Y | Y | N | N | services/marketing-content-engine.js | MEDIUM |
| Marketing coach | PARTIAL | Y | Y | Y | N | N | services/marketing-coach.js | MEDIUM |
| Marketing transcriber | PARTIAL | Y | Y | Y | N | N | services/marketing-transcriber.js | MEDIUM |
| Web intelligence | ACTIVE | Y | Y | Y | Y | Y | routes/web-intelligence-routes.js | HIGH |
| Web search integration | PARTIAL | Y | Y | Y | N | N | services/web-search-integration.js | MEDIUM |
| Website audit | ACTIVE | Y | Y | Y | Y | Y | routes/website-audit-routes.js | HIGH |
| Financial routes | ACTIVE | Y | Y | Y | Y | Y | routes/financial-routes.js | HIGH |
| Email provision (Postmark) | PARTIAL | N | N | N | N | N | — | MEDIUM |
| Browser agent core | PARTIAL | Y | Y | Y | N | N | services/browser-agent.js | MEDIUM |
| TC browser agent | PARTIAL | Y | Y | Y | N | N | services/tc-browser-agent.js | MEDIUM |
| ClientCare browser service | PARTIAL | Y | Y | Y | N | N | services/clientcare-browser-service.js | MEDIUM |
| Web search integration | PARTIAL | Y | Y | Y | N | N | services/web-search-integration.js | MEDIUM |
| Web search service | PARTIAL | Y | Y | Y | N | N | services/web-search-service.js | MEDIUM |
| Website audit routes | ACTIVE | Y | Y | Y | Y | Y | routes/website-audit-routes.js | HIGH |
| Web intelligence | ACTIVE | Y | Y | Y | Y | Y | routes/web-intelligence-routes.js | HIGH |
| Research aggregator | PARTIAL | Y | Y | Y | Y | Y | services/research-aggregator.js | MEDIUM |
| Funnel analyzer | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/funnel-analyzer.js | LOW |
| Document processor | PARTIAL | N | N | N | N | N | — | MEDIUM |
| PDF signature stamp | PARTIAL | Y | Y | Y | N | N | services/tc-pdf-signature-stamp.js | MEDIUM |
| Old self-programming path | LEGACY | Y | Y | Y | Y | Y | services/self-programming.js | LOW |
| Old self-improvement loop | LEGACY | Y | Y | Y | N | N | services/self-improvement-loop.js | LOW |
| Orphan routes (CJS in ESM, not imported) | LEGACY | N | N | N | N | N | — | LOW |
| Autonomous efficiency intelligence | LEGACY | Y | Y | Y | N | N | services/autonomous-efficiency-intelligence.js | LOW |
| ChatGPT import | LEGACY | Y | Y | Y | Y | Y | services/chatgpt-import.js | LOW |
| Logger (Pino) | PARTIAL | Y | Y | Y | Y | Y | services/logger.js | MEDIUM |
| Adam logger | PARTIAL | Y | Y | Y | N | N | services/adam-logger.js | MEDIUM |
| Telemetry | PARTIAL | Y | Y | Y | Y | Y | services/telemetry.js | MEDIUM |
| DB connection pool | PARTIAL | Y | Y | Y | Y | Y | services/db.js | MEDIUM |
| DB health monitor | PARTIAL | Y | Y | Y | N | N | services/db-health-monitor.js | MEDIUM |
| Migration runner | PARTIAL | Y | Y | Y | N | N | services/migration-runner.js | MEDIUM |
| Env validator | PARTIAL | Y | Y | Y | N | N | services/env-validator.js | MEDIUM |
| Env registry map | PARTIAL | Y | Y | Y | N | N | services/env-registry-map.js | MEDIUM |
| Response cache | PARTIAL | Y | Y | Y | N | N | services/response-cache.js | MEDIUM |
| Queue (BullMQ) | PARTIAL | Y | Y | Y | Y | Y | services/queue.js | MEDIUM |
| Execution queue | PARTIAL | Y | Y | Y | N | N | services/execution-queue.js | MEDIUM |
| Request tracer middleware | PARTIAL | Y | Y | Y | N | N | middleware/request-tracer.js | MEDIUM |
| Error boundary middleware | PARTIAL | Y | Y | Y | N | N | middleware/error-boundary.js | MEDIUM |
| Websocket handler | PARTIAL | Y | Y | Y | N | N | services/websocket-handler.js | MEDIUM |
| Twilio service | PARTIAL | Y | Y | Y | Y | Y | services/twilio-service.js | MEDIUM |
| Twilio webhook registrar | PARTIAL | Y | Y | Y | N | N | services/twilio-webhook-registrar.js | MEDIUM |
| Council service | PARTIAL | Y | Y | Y | Y | Y | services/council-service.js | MEDIUM |
| Consensus service | PARTIAL | Y | Y | Y | Y | Y | services/consensus-service.js | MEDIUM |
| Council prompt adapter | PARTIAL | Y | Y | Y | Y | Y | services/council-prompt-adapter.js | MEDIUM |
| AI model service | MISSING | N | N | N | N | Y | — | LOW |
| AI performance tracker | PARTIAL | Y | Y | Y | N | Y | services/ai-performance-tracker.js | MEDIUM |
| Rules engine | PARTIAL | Y | Y | Y | N | N | services/rules-engine.js | MEDIUM |
| Risk scorer | PARTIAL | Y | Y | Y | N | N | services/risk-scorer.js | MEDIUM |
| Continuous improvement | PARTIAL | Y | Y | Y | N | N | services/continuous-improvement.js | MEDIUM |
| Outcome tracker | PARTIAL | Y | Y | Y | N | N | services/outcome-tracker.js | MEDIUM |
| Decision ledger | PARTIAL | Y | Y | Y | N | N | services/decision-ledger.js | MEDIUM |
| Communication gateway | PARTIAL | Y | Y | Y | Y | Y | services/communication-gateway.js | MEDIUM |
| Prompt IR | PARTIAL | Y | Y | Y | N | N | services/prompt-ir.js | MEDIUM |
| Prompt translator | PARTIAL | Y | Y | Y | N | N | services/prompt-translator.js | MEDIUM |
| Tools status | BUILT BUT DISCONNECTED | Y | N | N | N | N | services/tools-status.js | LOW |
| UX evaluator | PARTIAL | Y | Y | Y | N | N | services/ux-evaluator.js | MEDIUM |
| Design quality gate | PARTIAL | Y | Y | Y | N | N | services/design-quality-gate.js | MEDIUM |
| Notification router (LifeOS) | PARTIAL | Y | Y | Y | Y | Y | services/lifeos-notification-router.js | MEDIUM |
| Community growth | PARTIAL | Y | Y | Y | Y | Y | services/community-growth.js | MEDIUM |
| Credential aliases | PARTIAL | Y | Y | Y | N | N | services/credential-aliases.js | MEDIUM |
| Video pipeline | ACTIVE | Y | Y | Y | Y | Y | routes/video-routes.js | HIGH |
| Game publisher | ACTIVE | Y | Y | Y | Y | Y | routes/game-routes.js | HIGH |
| Knowledge context | ACTIVE | Y | Y | Y | Y | Y | routes/knowledge-routes.js | HIGH |
| Idea queue | ACTIVE | Y | Y | Y | Y | Y | routes/idea-queue-routes.js | HIGH |
| Teacher OS | ACTIVE | Y | Y | Y | N | N | routes/teacher-os-routes.js | MEDIUM |

---

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
