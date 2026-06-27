<!-- SYNOPSIS: AMENDMENT 04 — Auto-Builder / Self-Programming System -->

# AMENDMENT 04 — Auto-Builder / Self-Programming System
**Status:** LIVE (autonomous — builder supervisor operational)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-06-27 — restored parse-safe BuilderOS alpha readiness service for live deploys.

---

## WHAT THIS IS
The system that writes, tests, and deploys its own code. Takes an idea → generates code → runs in sandbox → creates a snapshot → applies changes → validates → rolls back on failure. It is the most powerful and most dangerous feature in the platform.

**Mission:** Ship validated code improvements on explicit operator direction, with human approval for any production deployment.

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
| `scripts/autonomy/builder-supervisor.js` | **NEW** Headless orchestrator — spawns Claude Code CLI per segment, git worktree isolation, manages full build lifecycle |
| `services/builder-council-review.js` | **NEW** 4-lens pre-build council review before any file is touched; adversarial debate for conflict resolution |
| `routes/builder-supervisor-routes.js` | **NEW** Builder control API: run, run-sync, status, queue, pause, resume |
| `services/autonomy-scheduler.js` | **UPDATED** Now schedules builder every 6h (BUILDER_INTERVAL_MS override), first run 15min after boot |
| `.mcp.json` | **NEW** MCP server config — `neon-postgres` server for direct Neon DB access in Claude sessions |
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
| `builder_council_reviews` | **NEW** Per-segment council review results: verdict, guidance, perspectives JSONB, debate_ran |
| `adam_decision_profile` | **NEW** Predicted vs actual choices — accuracy tracked in `adam_prediction_accuracy` view |
| `projects.build_ready` | **NEW** Boolean gate — builder ignores projects where FALSE |
| `projects.council_persona` | **NEW** Per-project Great Minds persona (musk/jobs/edison/tesla) |
| `model_verdict_log` | **NEW** Per-lens, per-model verdict log with latency + cost; correlates to build outcomes |
| `model_performance_summary` | **NEW** View: accuracy %, avg latency, avg cost per model per lens |
| `model_lens_winner` | **NEW** View: current accuracy champion per lens (>= 3 scored verdicts) |

**Migrations:**
- `db/migrations/20260327_build_ready_gate.sql` — build_ready column + readiness metadata on projects
- `db/migrations/20260327_builder_council.sql` — builder_council_reviews, adam_decision_profile tables, adam_prediction_accuracy view
- `db/migrations/20260327_mark_build_ready.sql` — marks 7 projects BUILD_READY; sets per-project persona

### Key Endpoints
- `POST /api/v1/self-program` — trigger a self-programming task
- `POST /api/v1/auto-builder/run` — run auto-builder on an idea
- `GET /api/v1/auto-builder/status` — current build status
- `POST /api/v1/pipeline/run` — run idea-to-implementation pipeline
- `GET /api/v1/pipeline/status/:id` — pipeline run status
- `POST /api/v1/builder/run` — async trigger: spawns headless Claude Code supervisor (returns PID immediately)
- `POST /api/v1/builder/run-sync` — dry-run synchronous trigger (no file changes)
- `GET /api/v1/builder/status` — running state, last run JSON, in-progress segments, pending-adam from builder
- `GET /api/v1/builder/queue` — all segments grouped by safety class (safe/review/highRisk/active/blocked)
- `POST /api/v1/builder/pause` + `POST /api/v1/builder/resume` — pause/resume the builder loop

### Required Self-Programming Loop
The builder is no longer allowed to behave like a single black-box coder. Every serious autonomous build must follow this format:
1. **Proposal** — consume the council recommendation and produce a scoped build plan.
2. **Execution** — change only the files and behavior covered by that scoped plan.
3. **Verification** — run the declared checks and capture receipts.
4. **Review** — inspect whether the diff touched the right files and matched the intended outcome.
5. **Repair** — if verification or review fails, apply the smallest safe fix and retry.
6. **Scoring** — compare proposal quality, code quality, verification result, and repair quality separately.

The builder may implement code, but it does not get to self-certify success without receipts.

### Separation Of Duties
- **Council / planner** decides what should be built and names risks.
- **Builder / executor** writes the code.
- **Verifier / reviewer** checks behavior, touched files, and SSOT alignment.
- **Repair worker** fixes the smallest failing surface when needed.

One model may fill more than one role only when no safer alternative exists, and the run receipt must say that separation was collapsed.

---

## CURRENT STATE
- **KNOW:** `autoDeploy` defaults to `false` — human approval required for production (SSOT compliant)
- **KNOW:** Snapshot-before-change is implemented in `idea-to-implementation-pipeline.js`
- **KNOW:** `build_artifacts` table records receipts on component completion
- **KNOW:** Nightly runner exists at `scripts/autonomy/run-nightly.js`
- **KNOW:** Directed mode now disables the background auto-builder scheduler by default; builds must be explicitly triggered unless `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER=true`
- **KNOW:** `scripts/autonomy/builder-supervisor.js` is fully operational — spawns `claude --print --dangerously-skip-permissions` headlessly per segment; one git worktree per agent prevents cross-agent conflicts
- **KNOW:** `services/builder-council-review.js` runs 4 lenses in parallel before any build: Consequences (Groq), Time Traveler (Gemini), Trend Scout (Perplexity→Gemini fallback), Great Minds+Adam filter (Claude Sonnet); adversarial debate uses Claude Opus for conflict resolution
- **KNOW:** `build_ready` gate is live in DB — builder skips any project where `build_ready = FALSE`
- **KNOW:** 7 projects marked `build_ready=TRUE`; 11 remain NOT_READY (Gate 1 blockers documented in each amendment)
- **KNOW:** Builder runs every 6h via `autonomy-scheduler.js` (BUILDER_INTERVAL_MS override); first run 15min after boot
- **KNOW:** `adam_decision_profile` table tracks predicted vs actual choices; `adam_prediction_accuracy` view gives live accuracy %
- **KNOW:** Council review model routing: Groq (fast scan) → DeepSeek R1/Groq (Time Traveler + Debate, free Opus-level) → Perplexity (live trends) → Claude 3.7 Sonnet + extended thinking (persona) → Claude Opus (debate fallback)
- **KNOW:** Prompt caching active on Great Minds lens — persona + Adam profile content cached at ~10% token cost per repeat call
- **KNOW:** Extended thinking enabled for Great Minds lens (claude-3-7-sonnet, budget: 6000 tokens) — reasoning scratchpad before answering
- **KNOW:** DeepSeek R1 strips `<think>` scratchpad blocks automatically; final answer only returned to council
- **KNOW:** 5th council lens added: Codebase Coherence — `lensCodebaseCoherence()` feeds entire relevant codebase (amendment + routes + services files) to Gemini 2.5 Pro via `buildCodebaseContext()`; finds conflicts, duplication, pattern violations BEFORE a line is written; skipped gracefully if `rootDir` not provided
- **KNOW:** `callGeminiPro()` uses `gemini-2.5-pro` (1M token context), `maxOutputTokens: 4000`, returns deep architectural analysis
- **KNOW:** `builder-supervisor.js` now passes `rootDir: ROOT` to `reviewSegment()` — codebase coherence lens is always active in builds
- **KNOW:** Builder supervisor upgraded to `--output-format stream-json` — structured event parsing replaces raw stdout scraping; `toolsUsed` array logged per segment; clean final answer extracted from `result` event
- **KNOW:** Supervisor now prefers project-local `node_modules/.bin/claude` (version-pinned via `@anthropic-ai/claude-code` npm package) over global binary
- **KNOW:** MCP postgres server configured in `.mcp.json` — `neon-postgres` server gives Claude sessions direct Neon DB query access via `@modelcontextprotocol/server-postgres`; `enableAllProjectMcpServers: true` in `.claude/settings.local.json`
- **KNOW:** Governance spec upgrade applied (2026-03-27): `builder-supervisor.js` now validates segment spec before any work (skips segments missing `exact_outcome` or `allowed_files`); protected file enforcement checks builder only wrote to `allowed_files`; post-build verification gate runs `required_checks` before PR opens; `fetchPendingSegments` selects `review_tier`, `allowed_files`, `exact_outcome`, `required_checks`, `market_sensitive`; `buildPrompt` injects `exact_outcome` and `allowed_files` into builder prompt
- **KNOW:** `reviewSegment()` upgraded: 4-tier routing (tier_0=skip, tier_1=consequences+Adam, tier_2=full, tier_3=full+debate+human); `marketSensitive` parameter gates Trend Scout; unknowns budget: if 4+ lenses flag issues → NEEDS_HUMAN automatically; `lensGreatMinds` now returns structured JSON (risk, upside, missing_assumption, concrete_change, verdict) with text fallback
- **KNOW:** `manifest.schema.json` now includes `build_ready`, `market_sensitive`, `council_persona`, `segment_schema_version`, and `segments` (full execution contract array) properties
- **KNOW:** `db/migrations/20260327_governance_spec.sql` adds `review_tier`, `allowed_files`, `exact_outcome`, `required_checks`, `rollback_note` to `project_segments`; adds `market_sensitive` to `projects`; creates `build_outcomes` table for post-merge outcome scoring
- **KNOW:** `services/model-performance.js` logs per-lens verdicts to `model_verdict_log`; `scoreOutcome()` correlates council verdicts to build outcomes; `getLeaderboard()` + `getLensWinners()` expose accuracy rankings
- **KNOW:** `builder-council-review.js` logs every fulfilled lens verdict via `logVerdict()` after `storeReview()`; `PROVIDER_MODEL_MAP` maps provider labels to canonical model IDs
- **KNOW:** `builder-supervisor.js` inserts `build_outcomes` row on segment completion and calls `scoreOutcome()` to close the feedback loop
- **KNOW:** Model performance views: `model_performance_summary` (accuracy+cost per model/lens), `model_lens_winner` (current champion per lens, ≥3 scored verdicts)
- **KNOW:** `GET /api/v1/model-performance/leaderboard` + `/winners` + `/dissenters` + `/lens/:lens` + `POST /score-outcome` — full model grading API
- **KNOW:** `model_verdict_log.was_consensus_position` — true=voted with majority, false=dissented; set per-verdict after `Promise.allSettled` via majority-count logic in `reviewSegment`
- **KNOW:** `model_lens_dissent_leader` view — model with highest dissent accuracy per lens (≥3 dissent verdicts); the "canary" that is most often right when it goes against the group
- **KNOW:** `getDissenterLeader(pool, lens)` returns the dissent champion for a lens; used to assign adversarial slot
- **KNOW:** `reviewSegment({ devilsAdvocate: true })` prepends adversarial preamble to every lens — forces all models to argue against building before considering reasons to proceed; prevents groupthink on obvious wins
- **THINK:** Sandbox testing is limited — no real isolated execution environment, tests run in-process
- **DON'T KNOW:** Whether the builder supervisor has successfully shipped a real feature end-to-end (first autonomous run not yet observed)

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
- Background build scheduling MUST default to off in directed mode
- Auto-builder may only run on explicit operator request unless the scheduler is intentionally re-enabled
- Snapshot MUST be created before ANY file modification
- Rollback MUST be tested before the feature is considered complete
- Syntax validation (`node --check`) MUST pass before applying any JS change
- No self-modification of: server.js startup block, council-service.js, snapshot-service.js, this SSOT
- Human Guardian veto on any production deployment (North Star 3.1)
- All changes logged to `self_modifications` with what/when/why/who
- Proposal score, execution result, verification result, and repair result must be logged separately; one green test run does not erase a bad proposal or a risky repair path

---

## Change Receipts

| 2026-06-27 | **Queue-complete healthy-idle receipt for canonical BP scheduler** — `services/builderos-bp-priority-scheduler.js` now records a recent canonical receipt when the useful-work guard skips for `no_work`, marking `BP_PRIORITY queue complete` as a healthy idle cycle instead of an implicit failure. | Live production logs proved the scheduler was enabled and correctly checking work, but because completion skips never wrote a receipt, alpha readiness still blocked on `BP_PRIORITY_SCHEDULER_NOT_RECENT`. A queue-complete autonomous lane must count as healthy continuity, not as missing proof. | ✅ live log evidence of `BP_PRIORITY queue complete`; pending redeploy proof of recent healthy idle receipt | canonical queue truth at no-work idle |
| 2026-06-27 | **Restore parse-safe `builderos-system-alpha-readiness.js` for Railway boot** — replaced the mangled compressed variant on `origin/main` with the known-good parse-safe service body, including `COUNT(*)` repair-log queries and explicit string-built TSOS SQL instead of fragile multiline query literals. | Live Railway deploy logs showed boot dying before server start with `SyntaxError: Unexpected identifier 'COUNT'` in `services/builderos-system-alpha-readiness.js`, while the canonical local file imported cleanly. The deployed branch had a malformed one-line service artifact, so runtime could never reach the founder UI or self-repair loop. | ✅ `node --check services/builderos-system-alpha-readiness.js`; ✅ module import smoke; ⚠️ pending Railway redeploy/runtime SHA parity | restore boot path so founder/UI repair loops can resume |
| 2026-06-27 | **Directed-mode carveout for canonical BP scheduler** — `services/builderos-bp-priority-scheduler.js` now passes `allowInDirectedMode: true` into the shared useful-work guard, so explicit `BUILDEROS_AUTOPILOT=1` can run the canonical Point-B queue even while `LIFEOS_DIRECTED_MODE=true` continues to suppress generic background autonomy. | Live Railway logs showed the scheduler booting successfully and then getting skipped forever as “directed mode active,” which meant the runtime could truthfully report `enabled=true` while never generating a single queue receipt. The canonical governed queue needs its own PB-authorized lane or continuity remains theater. | ✅ live log evidence from `GET /api/v1/railway/managed-env/deployments/:id/logs`; pending redeploy proof of first queue receipt | canonical BP queue execution in directed mode |
| 2026-06-27 | **Canonical autonomy runtime truth + managed scheduler env controls** — `services/builderos-bp-priority-scheduler.js` now emits a canonical liveness/health status from the real `BP_PRIORITY` runner; `services/builderos-system-alpha-readiness.js` now scores autonomy continuity from that scheduler instead of older overnight sidecar artifacts and fail-closes when `BUILDEROS_AUTOPILOT` is disabled or stale; `services/builderos-improvement-loop.js` adds a deterministic improvement queue synthesizing SNT findings, Wisdom compound lessons, CFO cost posture, and Chair/ARC handoff recommendations; `services/railway-managed-env-service.js` now allowlists `BUILDEROS_AUTOPILOT*` runtime controls so the production system can self-enable the canonical queue via governed Railway env writes. | Local/runtime audit showed the biggest remaining fake-green risk: docs and sidecar receipts could imply continuity even while the canonical BP scheduler was disabled. This moves autonomy truth to the real queue, exposes the improvement backlog as a machine-readable surface, and removes the env-management blocker that prevented the live system from self-enabling the canonical queue. | ✅ `node --check` on touched services/routes; ✅ `node tests/builderos-model-escalation-gate.test.js`; ✅ `node tests/builderos-improvement-loop.test.js`; ✅ `npm run builder:preflight:fast` | canonical queue truth + improvement loop |
| 2026-06-27 | **Doctrine truth hardening + Studio artifact checks + canonical path cleanup** — `doctrine-enforcement.js` now fails any mission with nonzero acceptance exit, failing builder verdict, or non-pass objective verdict even when stale receipts still say PASS; `studio-simulation.js` now inspects actual UI artifact sources from blueprint content/targets for typography, atmosphere, responsiveness, and tokenized design control when founder asks require cutting-edge/non-generic design; `builderos-canonical-executor.js` no longer treats the legacy worktree supervisor as an equal active execution surface. Added regression tests for stale-PASS doctrine lies and generic UI artifact detection. | Competitor comparison and local audit showed three real weaknesses: stale receipts could overclaim success, Studio was judging founder-facing design from packet text alone, and the coder surface still implied two equal execution paths when only one is actually governed. This change makes those boundaries more honest and more enforceable. | ✅ `node --test tests/studio-simulation.test.js tests/doctrine-enforcement.test.js`; ✅ `npm run builderos:doctrine:verify -- PRODUCT-VOICE-RAIL-V1-0001` now FAILS honestly | canonical builder path + future rendered UI review |
| 2026-06-27 | **Simulation scoreboard + design/compute gate hardening** — `factory-staging/factory-core/arc/foundation/prediction-receipt.js` now emits `PREDICTION_RECEIPT.json` with accountable predictions plus `SIMULATION_ASSUMPTIONS.json` and `REALITY_CHECK_SCHEDULE.json`; added `REALITY_CHECK_RECEIPT` schema; `studio-simulation.js` now blocks under-specified “cutting-edge / not generic” founder asks; doctrine artifacts/seat contracts now require these receipts and make low-cost burst compute an explicit CFO decision. Added architecture docs for simulation scoreboarding, design quality gate, and compute escalation policy. | Adam pushed two missing doctrines into the machine path: simulations must later be checked against reality, and founder-facing design cannot drift into generic SaaS output while compute quietly escalates without justification. These are now governed artifacts instead of memory-only rules. | ✅ `node --check` foundation receipt + studio modules | mission generation path |
| 2026-06-27 | **Point B Alpha truth gate fix** — `factory-staging/factory-core/arc/foundation/point-b-target.js` no longer treats `TECHNICAL_PASS + acceptance PASS` as `alpha_reached` unless `OBJECTIVE_VERDICT.founder_usability_pass === true`; lesson now says machine path is awaiting founder confirmation. Added `tests/point-b-target.test.js` regression against the live LifeRE mission artifact. | Live founder probes showed a real truth bug: Point B navigator could drift toward `point_b_reached` before founder usability was confirmed, then the chair truth gate had to slap the claim back down. Alpha must stay false until founder confirmation is true. | ✅ local tests; ⚠️ deploy + re-run founder Point B probe | `node --test tests/point-b-target.test.js tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js` |
| 2026-06-27 | **`services/point-b-navigator.js` authority split** — separated `isPointBStatusIntent()` from `isPointBExecuteIntent()`; `handlePointBFounderMessage()` now auto-runs only on explicit continue/advance/do-the-next-step asks, not on pure status/progress asks. Added `tests/point-b-navigator.test.js`. | Live founder UI proving exposed a BuilderOS control bug: once status routing left generic display, a pure `status on the blueprint step you just started` ask was still re-triggering `execute_mission`. BuilderOS status asks must report, not silently mutate into work. | ✅ local tests; ⚠️ deploy + founder start→status live probe | `node --test tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js` |
| 2026-06-26 | **Intake UX fixes** — backfill 400 when amendment_text missing on Railway; ARC/chair/CLI next steps point to `POST /blueprint/intake/:id/execute`; chair-hook backfill mode; IGR-11 hint probe. | Founder hit AmendmentNotFound 500 and stale `/builder/run` execute hints. | ⚠️ deploy + IGR-11 | `npm run builderos:intake:ready` |
| 2026-06-26 | **Founder intake ready gate** — `scripts/builderos-intake-ready-gate.mjs` + `npm run builderos:intake:ready` (IGR-01..10: env, builder ready, deploy fresh, intake API, golden acceptance, pre-build gate). | Adam alpha → founder intake handoff needs one command proof. | ✅ IGR 10/10 PASS | `npm run builderos:intake:ready` |
| 2026-06-26 | **`intake-blueprint-executor.js`** — post-execute auto-redeploy + acceptance re-probe (`INTAKE_AUTO_REDEPLOY=1` default). | Committed intake steps need live deploy before HTTP acceptance is valid. | ⚠️ deploy + re-test execute | intake execute |
| 2026-06-26 | **`blueprint-intake.js`** — `loadExistingBlueprintForAmendment` DB fallback when `docs/` absent on Railway; best-effort disk write. | Adjust flow BlueprintNotFound on production Docker image. | ⚠️ deploy + adjust smoke | POST /blueprint/intake/adjust |
| 2026-06-26 | **`lifeos-builder-daemon.mjs`** — intake regression on probe cycles by default (`BUILDER_DAEMON_INTAKE_REGRESSION=1`). | Catch intake drift while daemon supervises. | ✅ wired | daemon probe cycle |
| 2026-06-26 | **Intake regression harness** — golden session registry + acceptance-only probe; pre-build PBG-07. | Builder platform fixes need automated regression without full MOS rebuild spend. | ✅ wired | `builderos:intake:regression:acceptance` |
| 2026-06-26 | **`intake-blueprint-executor.js`** — `buildVerifyFileHints` from blueprint SQL/routes; git pull before acceptance run. | Verify assertions wrong (IF NOT EXISTS, validationResult); local script stale vs GitHub. | ✅ MOS-P1-005 PASS | intake execute |
| 2026-06-26 | **`intake-blueprint-executor.js`** — verify reference → verify-builderos-working-definition; `buildRouteProbeHints` injects real mount paths; forbid marketingos hallucinations. | MOS-P1-005 probed fake /marketingos/* paths from stale reference. | ⚠️ re-run MOS-P1-005 | intake execute |
| 2026-06-26 | **Product route auto-wire** — `autoWireRoute` handles all `routes/*-routes.js` (not only lifeos-*); `POST /builder/wire-route`; intake executor wires after route step + runs acceptance_cmd. | SocialMediaOS routes committed but never mounted; verify script double-read body. | ⚠️ deploy + re-test MOS-P1-003/005 | `wire-route` + intake execute |
| 2026-06-26 | **Acceptance verify runtime skip** — paired with BUILDEROS_ALPHA verifier fix; esm_script forbids pg/pool imports. | MOS-P1-005 runtime gate false fail. | ✅ argv fix deployed | intake execute |
| 2026-06-26 | **Verify script intake hints** — esm_script uses verify-project.mjs reference; inject all impl files; shebang/main structure spec. | MOS-P1-005 syntax fail (unclosed block comment). | ✅ syntax pass | intake execute |
| 2026-06-26 | **Intake token budget** — esm steps request 16k max_output_tokens; drop amendment from files[]; style-guide-only hint. | MOS-P1-002 truncated mid-file (verifier syntax fail). | ✅ MOS-P1-002/003 committed | see BUILDEROS_ALPHA receipt |
| 2026-06-26 | **Intake executor codebase grounding** — `scanCodebasePatterns()` injected into step spec; reference files (action-inbox service/routes); forbidden import list. Governance retry passes `target_file`. | MOS-P1-002 blocked precommit governance (WRONG_IMPORT ../../core/*). | ⚠️ deploy + re-run from MOS-P1-002 | `blueprint:intake:execute --from MOS-P1-002` |
| 2026-06-26 | **SQL migration validation** — `validateSqlMigrationContent()` rejects JS in `.sql`; auto-retry gemini_flash. Reverted invalid migration. | groq emitted JS as SQL → Railway boot FAILED. | ⚠️ re-run from MOS-P1-001 | see above |
| 2026-06-26 | **Builder empty-output retry** — `/build` retries with `gemini_flash` when `code_execute` returns empty; intake executor uses fast path only for `sql` steps. | MOS-P1-002 service step: groq code_execute empty output after migration committed. | ✅ superseded — all intake steps now gemini_flash | re-run intake execute from MOS-P1-001 |
| 2026-06-26 | **Intake blueprint executor** — `services/intake-blueprint-executor.js`, `scripts/run-intake-blueprint.mjs`, `POST /api/v1/blueprint/intake/:id/execute`; `routes/lifeos-council-builder-routes.js` intake session FPv2 clearance; `builder-blueprint-gate.js` skeleton `step.file`. | SocialMediaOS builder test: `/build` blocked INTENT_AMBIGUITY after ARC PASS. | ✅ step 1 migration committed | `npm run blueprint:intake:execute -- --session <id>` |
| 2026-06-25 | **FIX: `services/blueprint-intake.js`** — `dedupeVerifySteps` removes orphan verify scripts before ARC; keeps canonical `verify-{slug}.mjs` aligned with `acceptance_cmd`. | ARC critical on MOS-P1-004 verify-project.mjs orphan. | ✅ pushed; live ARC retest pending | `--session ... --arc` |
| 2026-06-25 | **FIX: `services/blueprint-intake.js`** — `stripInvalidSteps` removes `.md`/GAP_FLAG steps; `scaffoldPhase1Steps` applies when founder answers request Phase 1 infra (Claude was putting GAP_FLAG in `type` instead of real steps). | Gap regen left 2 invalid steps; founder answers ignored. | ✅ live on 51e85ea — gap regen → arc_review with 4 Phase 1 steps | Fresh backfill + gap answers |
| 2026-06-25 | **FIX: `services/blueprint-intake.js` + `routes/blueprint-intake-routes.js`** — backfill now accepts `amendment_text` in body (previously required file path on server, but `docs/` is excluded from Railway Docker image via `.dockerignore:docs/*`). `scripts/run-blueprint-intake.mjs` rewritten to HTTP-first pattern (reads file locally, POSTs text to Railway API). `scripts/run-arc-entry-gate.mjs` simplified to structural-only check — AI review now lives exclusively in `/api/v1/blueprint/intake/:id/arc`. | Live test revealed AmendmentNotFound on Railway because docs/ not in Docker image. | ✅ syntax pass + live GET /api/v1/blueprint/intake returns 200 | `node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md` |
| 2026-06-25 | **Blueprint Intake Service (5 files)** — `db/migrations/20260625_blueprint_intake.sql` (blueprint_intake_sessions table with flow_type + status machine); `services/blueprint-codebase-scanner.js` (live pattern scan before every blueprint gen); `services/blueprint-intake.js` (three flows: backfill/greenfield/adjustment, gap detection, ARC review, answer gaps); `routes/blueprint-intake-routes.js` (9 endpoints including chair-hook); `scripts/run-arc-entry-gate.mjs` + `scripts/run-arc-pipeline.mjs` + `scripts/run-blueprint-intake.mjs` (CLI backfill tool). Wired into `core/two-tier-system-init.js`. npm scripts: `blueprint:intake`, `blueprint:intake:list`. GAP REMAINING: chair-orchestrator `blueprint_execute` channel doesn't detect adjustment/greenfield intent yet — only routes to mission ID. CLI AI review won't work until council-service export is bridged. | Adam: build the Blueprint Intake Service for all three flows; fix BuilderOS so it can generate its own blueprints from existing amendments | ⚠️ syntax pass; chair-hook wired; ARC gate wired | `npm run blueprint:intake:list` |
| 2026-06-13 | **`services/railway-managed-env-service.js`** — allowlist FP V2 production env keys (`CHAIR_PREDICTION_SCORE_ENABLED`, `LANE_INTEL_*`, search API keys). | Managed-env bulk can enable scoreboard + lane intel on Railway. | ✅ | `npm run system:fp-v2:production-env` |
| 2026-06-13 | **`execute-mission.mjs`** — IDC exit gate before builder entry (pairs with unified FP V2 mission gate). | Close CLI bypass on mission execute spawn paths. | ✅ verify-chair-fp-v2 | deploy |
| 2026-06-22 | **`services/founder-packet-v2-unified-gate.js`** + **`factory-arc-loader.js`** — FP V2 end-to-end: live Chair + IDC exit + builder entry on all execute paths; council `/build`, founder routeToBuilder, terminal bridge gated. | Adam: full Founder Packet V2 enforcement not just Chair prompt. | ✅ unified gate tests | deploy |
| 2026-06-22 | **`services/obstacle-web-research.js`** tracked — imported by point-b-navigator at boot; was local-only. Dockerfile spine file asserts added. | Same class of boot crash as quorum-escalation — wired but not in git. | ✅ node --check | deploy |
| 2026-06-20 | **Railway boot fix:** `services/repo-root.js`, `services/point-b-target-lite.js`, `services/factory-arc-loader.js` — production spine lazy-loads factory-staging; point-b-navigator + bp-priority-scheduler no longer static-import arc modules at boot. `Dockerfile` RUN verifies `run-step.js` in image. | Railway healthcheck fail: ERR_MODULE_NOT_FOUND run-step.js — dockerignore had excluded factory-staging. | ✅ boot import test | deploy |
| 2026-06-20 | **`services/point-b-navigator.js`** — Point B navigator invoked only via Lumin Chair `point_b` channel (`lumin-chair-orchestrator.js`); no longer a sibling parallel route on founder-interface. | Founder: Point B orchestration must be subroutine of Lumin Chair, not separate desk. | ✅ chair + navigator tests | deploy |
| 2026-06-22 | **Point B spine audit repairs** — restored `scripts/run-point-b-gate.mjs`; fixed `studio-simulation.js` scope for direct product-host missions; `point-b-gate.js` accepts no-gap builder sim receipts; restored `builder-pre-build-simulate.mjs`; `bpb/intake-gate.js` accepts legacy `FOUNDER_PACKET.md + INTENT_BASELINE.json`; `mission-lib.mjs` now honors frozen legacy-write policy; `execute-mission.mjs` writes `BUILDER_RUN_RECEIPT.json` before Point B/doctrine evaluation; updated LifeOS product authority block and continuity truth | Audit found mechanical gate drift and false negatives across Foundation → Builder → Point B; machine path needed to clear honestly before founder usability | ✅ local foundation loop + point-b gate + tests | `node scripts/run-foundation-pipeline.mjs PRODUCT-LIFERE-OS-V1-0001 --once --force` |
| 2026-06-22 | **Point B Autonomous Driver** — `services/point-b-navigator.js`, `services/obstacle-web-research.js`, founder-interface default → navigator + `GET …/point-b/status`, `lifeos-lifere.html` + app LifeRE nav/Point B strip, `BLUEPRINT.json` for LifeRE, acceptance v2 (DOM markers), `execute-mission.mjs` BPB intake + execute-step + SENTRY, `builderos-bp-priority-scheduler.js` useful-work-guard, OBSTACLE_LESSON_LEDGER trimmed (5586→200), tool registry wired flags | Adam: system picks next gate toward Point B without path choices | ✅ acceptance + navigator tests | `npm run lifeos:lifere-os:v1-acceptance` |
| 2026-06-21 | **Point B = LifeRE Alpha + obstacle doctrine** — `POINT_B_TARGET.json`, `obstacle-lesson-loop.js`, `point-b-target.js`, loop v3, LifeRE on BP_PRIORITY rank 6, acceptance script | Adam: Point B is LifeRE Alpha; obstacles are lessons; stopping is failure | ✅ 5/5 tests | `npm run builderos:foundation:pipeline -- --bounded` |
| 2026-06-20 | **Never-stop foundation loop** — `phase-repair.js`, `runFoundationPipelineLoop()`, `assemble-pre-build-packet.mjs`, default loop in pipeline script | Adam: loop and repair until phase PASS | ✅ 2/2 phase-repair tests | `npm run builderos:foundation:pipeline -- MISSION_ID` |
| 2026-06-17 | **BUG FIX: `factory-staging/factory-core/arc/foundation/coverage-map.js`** — `levelFor()` checked `v === true` (strict) but `baseline?.failure_metrics?.length` returns a number (e.g. `2`), causing `failure_metric` to always resolve as `MISSING` even when INTENT_BASELINE.json had valid entries. Fixed: `v && v !== 'PARTIAL' && v !== 'PARKED'`. Also fixed: **`scripts/bp-priority-never-stop.mjs`** import paths; **`services/builderos-bp-priority-scheduler.js`** (NEW); **`startup/boot-domains.js`** — added `bootBuilderOSPriorityQueue`. | Voice Rail pipeline always failing at development stage with `failure_metric:MISSING` | ✅ tier1_load_bearing_ready for Voice Rail | `npm run builderos:bp-priority:once` |
| 2026-06-17 | **Doctrine enforcement stack** — `DEPARTMENT_ROLE_CONTRACT.json`, `MISSION_PHASE_ARTIFACTS.json`, `doctrine-enforcement.js`, `simulation-measurements.js`, `reality-score.js`, `TWIN_DRIFT_REPORT`, department sim measurements, `DOCTRINE_COMPLIANCE` HARD gate, `verify-mission-doctrine.mjs` | Adam: no discards, departments enforced, sim→reality scored | ✅ 11/11 doctrine+point-b tests | `npm run builderos:doctrine:verify -- MISSION` |
| 2026-06-17 | **V2 production recovery + gate hardening** — GAP-FILL boot chain (adf/builderos-arc routes, blueprint-write-policy, import paths); both v2 acceptances PASS on `7a7c96d0f4`; `SEAT_ACCOUNTABILITY_MATRIX.json` per mission; SNT translation requires `evidence_if_wrong` + prod route probe; point-b-gate blocks empty builder sim + acceptance FAIL | Adam plan #1–#5 | ✅ capture + commitment v2 acceptance PASS | Alpha confirm pending |
| 2026-06-17 | GAP-FILL: **`builderos-reboot/scripts/blueprint-write-policy.mjs`** — imported by `simulate-blueprint-steps.js` at ARC boot; Railway `15277e0ed4` FAILED missing module | Third boot crash in deploy chain | pending redeploy | commit + push |
| 2026-06-17 | GAP-FILL: **`services/builderos-arc-service.js`** — factory-staging imports used `../../` (resolved to `/usr/src/factory-staging` in Docker) instead of `../`; Railway `8570554438` FAILED boot | Second boot crash after adf-routes commit | pending redeploy | fix imports + push |
| 2026-06-17 | GAP-FILL: **`routes/adf-routes.js`**, **`routes/builderos-arc-routes.js`**, **`services/adf-prediction-ledger.js`**, **`services/builderos-arc-service.js`** — imported by `register-runtime-routes.js` in `3e7611d4e9` but never committed; Railway deploy `3e7611d4e9` FAILED `ERR_MODULE_NOT_FOUND adf-routes.js`; prod stuck on `6a45d8f` without v2 routes | Adam #1 recover production truth — deploy audit found boot crash not lag | pending redeploy + v2 acceptance | commit + push + build-from-latest |
| 2026-06-17 | **V2 HARD enforcement stack** — `gate-enforcement.js`, `foundation/prediction-receipt.js`, `foundation/builder-entry-gate.js`, `foundation/mission-ledger.js`, `GATE_ENFORCEMENT_MATRIX.json`, `department-simulations.js`, `idc-exit-gate.js`, `run-foundation.js`, `translate-mission.js`, `execute-mission.mjs`, `scripts/bp-priority-never-stop.mjs` | Adam: fail-closed on doctrine bypass | ✅ 6/6 point-b-gate tests | `npm run builderos:bp-priority:never-stop` |
| 2026-06-16 | **Foundation pipeline** — `factory-staging/factory-core/arc/foundation/*`, `run-foundation.js`, `scripts/run-foundation-pipeline.mjs` | Full founder-doc machine path | ✅ Action Inbox MACHINE_PATH_PASS_AWAITING_ALPHA | Alpha confirm pending |
| 2026-06-16 | **`point-b-gate.js` v2**, **`run-system-path.mjs`**, **`bootstrap-product-mission.js`**, **`run-alpha-confirm.mjs`**, **`execute-mission.mjs`**, **`translate-mission.js`**, **`ARC_JOB.json`** — Split gates: **B handoff** (FP complete, Adam done) → **B→C machine path** (ARC+Builder+TECHNICAL_PASS) → **C Alpha** (founder confirms only). Removed founder_usability as machine blocker. Honest intent coverage at bootstrap. Full system path runs bootstrap→ARC→Builder automatically. | Adam: after FP his job done till Alpha; lying about intent completeness = system fail | ✅ Action Inbox `MACHINE_PATH_PASS_AWAITING_ALPHA` exit 0 | Alpha: `npm run builderos:alpha:confirm -- MISSION --confirm` |
| 2026-06-16 | **`builderos-reboot/scripts/blueprint-write-policy.mjs`**, **`mission-lib.mjs`**, **`execute-mission.mjs`**, **`factory-staging/factory-core/arc/builder-cold-walk.js`**, **`simulate-blueprint-steps.js`**, **`tests/builder-blueprint-spine-write.test.js`** — frozen blueprint steps (`write_file_exact` + sha256 + sandbox) may write monorepo spine (`services/`, `package.json`); cold walk + simulator aligned; execute uses `acceptance_command` from blueprint. Verified: `execute-mission.mjs BUILDEROS-INTAKE-LOOP-V1-0001` 14/14 DONE + intake acceptance PASS. | Adam: fix Builder — legacy quarantine blocked IL-S08+; get handoff working | ✅ 3/3 spine tests + 14-step execute | next: commit ARC stack + BP_PRIORITY register |
| 2026-06-16 | **`services/adf-prediction-ledger.js`**, **`routes/adf-routes.js`**, **`scripts/adf-ledger.mjs`**, **`tests/adf-prediction-ledger.test.js`** — file-based predict → actual → score → lesson loop at `data/adf-predictions/` + `adf-lessons.json`; API `/api/v1/adf/*`; council `loadAdamProfile` injects scored lessons; refreshed `ADAM_SEED_PROFILE`. npm: `adf:status`, `adf:list`, `adf:lessons`, `adf:corpus`. Scored pred-001 (1.0) pred-002 (0.0) from Adam directive. | Adam: implement ADF, guess + accountable, every lesson adjusts | ✅ 3/3 unit tests | corpus ingest via `npm run adf:corpus` |
| 2026-06-12 | **`services/builder-blueprint-gate.js`** + **`routes/lifeos-council-builder-routes.js`** — `/build` fail-closed blueprint gate for `routes/`, `services/`, `public/overlay/` (requires `blueprint_path` / `blueprint_id` / `mission_id` with step covering target). **`scripts/system-railway-redeploy.mjs`** — 410 legacy deploy falls through to `build-from-latest`. **`services/builderos-governed-loop-executor.js`** + **`voice-rail-command-executor.js`** — surface `commit_sha` in command exec receipts. **`tests/builder-blueprint-gate.test.js`**. Stash archive: 64 cleared → `builderos-reboot/_hist/GIT_STASH_ARCHIVE/`. | Adam: next 10 system items — enforce §2.18, clean stashes, fix deploy + Voice Rail receipts | ✅ 4/4 blueprint gate tests | pending prod proofs |
| 2026-05-24 | **`routes/railway-managed-env-routes.js`:** `serviceInstanceDeploy` now uses `latestCommit:true` or explicit `commitSha`; `POST .../deployments/:id/redeploy` promotes a prior build. Fixes stale rollback when GH Actions token dead. | Adam stuck on v2.3.1; build-from-latest redeployed old SHA | AM04 | pending deploy |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-04-01 | Added the required self-programming loop (proposal, execution, verification, review, repair, scoring) plus explicit separation-of-duties rules | The builder now has a documented operating contract for how autonomous code work must be evaluated instead of acting like a single black-box coder | ✅ | pending | pending |
| 2026-05-25 | **`services/autonomy-scheduler.js` — LEGACY PRODUCT-LEVEL classification:** Added `@legacy PRODUCT-LEVEL` header. Changed gate from confusing `LIFEOS_DIRECTED_MODE !== 'false'` to explicit `LEGACY_SCHEDULER_ENABLED=true` opt-in (backward compat preserved via OR condition). 12 ungoverned AI calls (BoldTrail, Digital Twin, Pipeline, Self-Improvement) now require explicit opt-in. Railway gate confirmed absent (LEGACY_SCHEDULER_ENABLED not in Railway vault as of 2026-05-25 audit). | Ungoverned AI calls without useful-work-guard are a Zero-Waste + PB governance violation. BuilderOS governed runtime must not start these automatically. | ✅ `node --check` PASS | n/a | `LEGACY_SCHEDULER_ENABLED` absent from Railway — schedulers do not fire |
| 2026-05-09c | **Codebase cleanup** — 231 orphaned files purged: 15 root junk JS files (A.js, B.js, test1-3.js, cron_job.js, cron-job.js, deepseek-bridge.js, discoveryScanner.js, etc.), 2 dead route files (routes/ahni.js, routes/api.js), services/tc-webhook-validator.js (truncated, never imported), entire frontend/ (159 files) and backend/ (45 files) directories with zero server references, 7 stale screenshot PNGs. Fixed routes/tsos-task-ledger-routes.js: builder-committed `exp` typo → `export function`; added missing `import express`. Removed dead `test:smoke` script from package.json (referenced non-existent scripts/smoke-test-server.js). | Comprehensive single-pass audit to remove dead weight from repo. Builder daemon had committed broken JS syntax in tsos-task-ledger-routes.js. | ✅ `node --check` all remaining JS PASS · `git push` cda55c87 |
| 2026-05-09b | **GQL schema fix** — `routes/railway-managed-env-routes.js`: `meta { commitHash... }` → `meta` (scalar). Railway v2 `DeploymentMeta` is a JSON scalar, not a subfield-expandable type; live test returned `GRAPHQL_VALIDATION_FAILED`. `meta` now returns the full blob as a plain JSON value. | Live test revealed schema mismatch. | ✅ `node --check` PASS · live `/deployments/latest` confirmed 200 after deploy |
| 2026-05-09 | **Railway deployment log reading** — `routes/railway-managed-env-routes.js`: added `import { readFile, stat }` (node:fs/promises) and `import { join }` (node:path). Added 5 new authenticated routes (all require command key): `GET /deployments?first=N` — lists last N Railway deployments via GraphQL (status, createdAt, commit metadata, url); `GET /deployments/latest` — most recent deployment with `success: bool`; `GET /deployments/:id/logs?limit=N` — build logs via Railway GraphQL `deploymentLogs` query; `GET /logs/local` — lists 15 whitelisted local log/data files with size+mtime; `GET /logs/local/:name?lines=N&raw=1` — tail last N lines of any whitelisted file (strict allowlist: logs/*.log, logs/*.out, data/*.jsonl, data/quarantined-tasks.json). Uses existing `railwayGql()` helper. | System could trigger deploys but had no observability: no way to know if deploy succeeded, read build output, or tail daemon logs. Closes the full loop: push → trigger → poll latest → read build logs on failure. | ✅ `node --check routes/railway-managed-env-routes.js` PASS |
| 2026-04-27 | GAP-FILL: `routes/railway-managed-env-routes.js` — refactored to shared `railwayGql()` helper; added `internalRailwayBuildFromLatest()` using `serviceInstanceDeploy` mutation; added `POST /api/v1/railway/managed-env/build-from-latest` endpoint. Prior endpoint `self-redeploy` uses `serviceInstanceRedeploy` (restart only — doesn't pull new GitHub commits). New endpoint rebuilds from source. | Railway wasn't auto-deploying pushed commits; crash-loop on missing module meant `serviceInstanceRedeploy` kept restarting broken image. Need force-rebuild capability. | ✅ node --check | n/a | n/a |
| 2026-04-23 | GAP-FILL: Added `POST /api/v1/railway/managed-env/self-redeploy` to `routes/railway-managed-env-routes.js`; updated `scripts/system-railway-redeploy.mjs` with 2-path fallback (command-key → RAILWAY_TOKEN) | System needed ability to redeploy itself using its own Railway vault credentials when local COMMAND_CENTER_KEY is out of sync; previous `/api/v1/railway/deploy` required matching local key | ✅ node --check | pending | pending |
| 2026-04-25 | Added `POST /api/v1/railway/managed-env/rotate-command-key` + `GET /sync-command-key` to `routes/railway-managed-env-routes.js`; added `scripts/system-rotate-command-key.mjs` + `scripts/system-sync-command-key.mjs`; added `npm run system:rotate-command-key` + `npm run system:sync-command-key` | CCK drifted between Railway vault and local .env.local; rotate sets a new key in both; sync pulls Railway's live key into .env.local without changing vault; both use x-railway-token escape-hatch | ✅ node --check | pending | pending |

---

## Pre-Build Readiness

**Status:** BUILD_READY (builder supervisor + council review — core loop complete)
**Adaptability Score:** 88/100
**Council Persona:** musk (first principles — what can we delete? is there a 10x simpler version?)
**Last Updated:** 2026-06-16

### Gate 1 — Implementation Detail
- [x] Builder supervisor spawns Claude Code headlessly with --dangerously-skip-permissions
- [x] Council review service runs 4 lenses in parallel on free tier
- [x] Git worktree isolation — one worktree per agent, zero cross-agent conflicts
- [x] build_ready gate prevents builder from touching unvetted projects
- [x] adam_decision_profile learns from real decisions over time

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Devin (Cognition) | 67% PR merge rate, full web agent | $20+/mo, cloud-only, no domain context | We run on our own infra with full domain knowledge baked into every prompt |
| GitHub Copilot Workspace | GitHub-native, async | No custom personas, no pre-build review, no Adam filter | We run 4 lenses + adversarial debate before touching a file |
| Aider | Great headless CLI, open source | No orchestration layer, no council review | We can use Aider as a second agent type via our supervisor |
| OpenHands | 72% SWE-bench, REST API | Generic, no SSOT governance, no domain training | We have constitutional governance + amendment readiness gates |
| Cursor Background Agents | Cloud sandboxes, parallel | Subscription cost, no custom review layer | Our council runs free; Cursor is opt-in addition, not dependency |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Claude Code -p flag behavior changes | Low | High | Monitor Anthropic docs; fallback to SDK if CLI changes |
| Free tier models get worse at code review | Medium | Medium | Council review uses verdict fallback to PROCEED if all lenses fail |
| Git worktree conflicts on Railway (read-only FS) | Medium | High | Builder runs locally or in Railway with writable volume mounted |
| Adam overrides STOP 100% of the time (defeats purpose) | Low | Medium | Track override rate in adam_decision_profile; surface in Command Center |

### Gate 4 — Adaptability Strategy
New agent types (Aider, Codex CLI, Devin API) plug into `spawnAgent()` factory pattern — same worktree, same council review, different binary. Score: 88/100.
- New council lenses: add function to `builder-council-review.js`, add to parallel Promise.allSettled
- New personas: add to PERSONAS constant in `builder-council-review.js` — 5 lines

### Gate 5 — How We Beat Them
While Devin runs blindly against a GitHub issue, our builder consults Edison, Tesla, Musk, and the Adam filter before writing a line — meaning the code that comes out the other end already accounts for unintended consequences, 2-year retrospectives, and what you would have built if you'd been a programmer.
