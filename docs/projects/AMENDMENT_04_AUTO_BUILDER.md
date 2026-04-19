# AMENDMENT 04 — Auto-Builder / Self-Programming System
**Status:** LIVE (autonomous — builder supervisor operational)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-04-01 (self-programming evaluation loop)

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

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-04-01 | Added the required self-programming loop (proposal, execution, verification, review, repair, scoring) plus explicit separation-of-duties rules | The builder now has a documented operating contract for how autonomous code work must be evaluated instead of acting like a single black-box coder | ✅ | pending | pending |

---

## Pre-Build Readiness

**Status:** BUILD_READY (builder supervisor + council review — core loop complete)
**Adaptability Score:** 88/100
**Council Persona:** musk (first principles — what can we delete? is there a 10x simpler version?)
**Last Updated:** 2026-04-01

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
