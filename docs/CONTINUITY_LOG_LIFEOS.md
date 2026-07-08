<!-- SYNOPSIS: Continuity Log — LifeOS Core Lane -->

# Continuity Log — LifeOS Core Lane

> Log sessions that primarily change Amendment 21, LifeOS routes/services, LifeOS migrations, or LifeOS overlays.

**Most recent first.**

---

## [BUILD] Update 2026-07-03 — Loop self-build proof, prod outage + hardening, Chair debates, standing orders

### What happened
- **Planner unblocked (#304).** Raised the planner output cap (2000→8000), added
  `salvageSteps()` for truncated JSON plans, and auto strong-model failover
  (Anthropic→OpenAI→Gemini). The loop then **autonomously planned a lifeos queue and built
  a DB migration** — real proof it builds itself.
- **PROD OUTAGE (fixed #307).** The loop-authored `db/migrations/20260420_lifeos_phase2_schema.sql`
  declared `habit_logs.habit_id uuid REFERENCES habits(id)`; a legacy `habits` table already
  exists with `id integer`, so the uuid FK "cannot be implemented", the migration threw,
  `initDatabase` re-threw, and founder-runtime boot aborted **before route registration** —
  every route 404 (only `/health` up). Fix: drop the FK **and** make `startup/database.js`
  log-and-continue on a bad migration instead of throwing. One bad migration can now degrade
  a feature but never take down the whole server.
- **Provider-key health (#305).** `GET /api/v1/lifeos/provider-key-health` enumerates Railway
  keys, tests funding with a 1-token call, returns billing links.
- **Chair debates + governance (#306, #300).** Consensus Ledger row 6 = round-2 debate on the
  integrity auditor (ranked build order + Dead-Reckoning Audit). SO-003 ratified (never idle
  on tokens; never cheap on the most-important function).
- **Decisions/ideas captured:** `builderos-reboot/governance/SESSION_DECISIONS_2026-07-03.md`
  (laws) and `docs/products/ideavault/conversations/2026-07-03_twin-evolution-and-integrity-auditor.md`
  (brainstorm: dual-twin competitive evolution + AI incentives + the 1% lie auditor).

### Verification
- Live Railway deploy logs (`88116e40`) showed the migration FK failure + boot abort; DB
  confirmed `habits.id` integer, `habit_logs` missing.
- Post-#307 deploy (`5d7527b5`): routes 200, migration recorded applied, `habit_logs` exists,
  loop re-enabled on a fresh container.

### Next
- Watch the loop resume and ship a real rank-8 lifeos defect (founder's proof).
- Parked (design w/ Chair + Composer 2.5 as consensus partner): dual-twin competitive
  evolution; the integrity-auditor build; the one-memory-group auto-load feature.

## [BUILD] Update 2026-06-27 — Founder continue-to-Point-B routing hardening

### What happened
- **The next founder-path bug appeared right after status authority was fixed live.** `continue building toward point b until pass or exact blocker` still routed to `mission_pipeline` and returned receipt-scan/foundation-pipeline failure instead of staying in the Point B execution lane.
- **Root cause was classifier priority.** `chair-context-classifier.js` was still returning `mission_pipeline` before giving high-confidence Point B system asks a chance to stay in the Point B navigator lane.
- **Fix shipped locally.** High-confidence Point B system routing now wins before the generic `mission_pipeline` branch, and the exact founder phrasing is locked by regression.

### Verification
- `node --test tests/chair-context-classifier.test.js tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`

### Next
Deploy this classifier fix, rerun the live founder continue-to-Point-B probe, then continue walking the founder UI path until the next autonomy blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder continuation-language hardening + LifeRE truth-split audit

### What happened
- **Two founder-language defects remained after Point B routing was repaired.** Natural continuation shorthand like `keep going until pass or exact blocker` still fell into display/counsel, and explicit `run execute mission for PRODUCT-LIFERE-OS-V1-0001` was being classified as generic blueprint execution and blocked by Founder Packet ambiguity instead of entering the governed Point B mission loop.
- **Routing is now tightened around actual founder phrasing.** `services/lumin-conversation-routing.js` keeps continue-to-pass language out of display-only routing, and `services/chair-context-classifier.js` now routes those shorthand continuation asks plus explicit product mission execution into the Point B lane.
- **A real truth split was also surfaced, not fixed over.** Local mission artifacts for `PRODUCT-LIFERE-OS-V1-0001` currently show acceptance `PASS` and `BUILDER_RUN_RECEIPT.verdict = TECHNICAL_PASS`, while the live founder endpoint still reports `machine:acceptance FAIL — result truth wins over corridor pass`. That contradiction is now explicitly recorded as unresolved.

### Verification
- `node --test tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/point-b-navigator.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`
- Live founder probe (current deploy `66ad2bd0939d2931570de2aa91ef9f0f63758a8d`):
  - `continue building toward point b until pass or exact blocker` → `point_b`, `RUNNING`, `execute_mission`
  - `keep going until pass or exact blocker` → wrong on live before this patch (`display` / `NO_COMMAND_RAN`)
  - `run execute mission for PRODUCT-LIFERE-OS-V1-0001` → wrong on live before this patch (`blueprint_execute` → FPv2 ambiguity block)

### Next
Deploy the continuation-language fix, rerun the founder continuation battery on Railway, then trace whether the live Point B gate is reading stale acceptance receipts or stale runtime files.

## [BUILD] Update 2026-06-27 — Point B Alpha truth-gate repair

### What happened
- **The continuation deploy resolved the original receipt contradiction.** Production now reports the same core state as local LifeRE artifacts: machine path complete, founder usability still required.
- **That exposed a subtler Point B bug.** `evaluatePointBTargetReached()` could still infer `alpha_reached` from `TECHNICAL_PASS + acceptance PASS` even when `founder_usability_pass` was false, forcing the chair truth gate to block the overclaim after the navigator had already drifted toward `point_b_reached`.
- **Fix shipped locally.** `factory-staging/factory-core/arc/foundation/point-b-target.js` now requires `founder_usability_pass === true` before internal Alpha/Point-B claims become true. Regression `tests/point-b-target.test.js` proves the current LifeRE mission stays below Point B until founder confirmation exists.

### Verification
- `node --test tests/point-b-target.test.js tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`
- Live founder probe on deploy `509ff74f0a04d3afffe36d70ae5e18d9675ee4fe`:
  - `keep going until pass or exact blocker` → `point_b`, not display
  - `run execute mission for PRODUCT-LIFERE-OS-V1-0001` → `point_b`, not blueprint ambiguity
  - state now honestly reports machine path complete + founder usability pending

### Next
Deploy the Point B Alpha truth-gate fix, rerun the founder Point B probe, then stop only when the remaining gate is the founder’s real usability confirmation.

## [BUILD] Update 2026-06-27 — Founder continuity hardening v3 (auth sentinel ids no longer block thread recall)

### What happened
- **A third continuity defect remained after the first two fixes.** The founder route under command-key fallback still passed `userId = "emergency-key"` into `runLuminChairTurn()`.
- **Root cause was a truthy auth sentinel.** Because `"emergency-key"` is truthy, the chair treated it like a real user id and skipped handle-based founder id resolution, so persisted thread history could still miss and recall prompts could still fall into search.
- **Fix shipped locally.** `services/lumin-chair-orchestrator.js` now accepts only numeric `userId` values and otherwise resolves the founder’s numeric id from handle before loading thread history. `tests/lumin-chair-orchestrator.test.js` now covers the exact sentinel-id case that was breaking continuity parity.

### Verification
- `node --test tests/lumin-chair-orchestrator.test.js tests/chair-program-direct-answer.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/lumin-conversation-routing.test.js`

### Next
Deploy this third continuity fix, rerun the live founder phrase-recall probe, then keep pushing BuilderOS through the founder UI path until the next real autonomous-build blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder blueprint-status routing hardening

### What happened
- **Continuity was fixed live, then the next founder-path bug surfaced immediately.** A blueprint execute order correctly returned `blueprint_execute`, but `status on the blueprint step you just started` collapsed into generic `display` and rendered queue output instead of governed mission status.
- **Root cause was status misclassification.** `isExplicitDisplayOnlyRequest()` still treated mission/blueprint status asks as passive display requests, so the route never reached governed system-status logic.
- **Fix shipped locally.** `services/lumin-conversation-routing.js` now keeps mission/blueprint/Point B status asks out of display-only routing, and `services/chair-context-classifier.js` now raises their system score so they route to governed status logic instead of queue display.

### Verification
- `node --test tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`

### Next
Deploy this routing fix, rerun the live founder blueprint-status probe, then continue pushing BuilderOS through the same founder UI path until the next real autonomy blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder Point B authority hardening (status must not re-execute)

### What happened
- **The next founder-path bug appeared immediately after status routing improved.** `status on the blueprint step you just started` stopped collapsing into display, but it still caused the Point B navigator to auto-run `execute_mission` again.
- **Root cause was authority bleed.** `handlePointBFounderMessage()` treated any Point B status-style utterance as permission to auto-run the next machine action, which violates founder control and the BuilderOS Founder Packet boundary.
- **Fix shipped locally.** `services/point-b-navigator.js` now separates `isPointBStatusIntent()` from `isPointBExecuteIntent()`, so only explicit continue/advance/do-the-next-step asks can auto-run work; pure status/progress asks return governed truth only.

### Verification
- `node --test tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`

### Next
Deploy this authority fix, rerun the live founder blueprint start→status probe, then continue walking the founder UI path until the next autonomy blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder continuity hardening v2 (handle-only auth now loads thread history)

### What happened
- **Live recall still failed after the first patch.** Even with thread-recall questions blocked from factual-search short-circuits, the live founder probe still answered from `verified_search`.
- **Root cause was identity shape, not just answer routing.** Command-key founder requests often arrived with `userHandle` but no numeric `userId`. `runLuminChairTurn()` only loaded persisted founder thread history when `userId` was already present, so `recent_thread` was absent and continuity still broke.
- **Fix shipped locally.** `services/lumin-chair-orchestrator.js` now resolves a numeric user id from handle before calling `loadFounderThreadHistory()`, and `routes/lifeos-builderos-command-control-routes.js` passes the resolver into the orchestrator.

### Verification
- `node --test tests/lumin-chair-orchestrator.test.js tests/chair-program-direct-answer.test.js` → PASS
- New regression proves handle-only founder auth still loads server thread history.
- Previous live probe remains the failing proof to invalidate until deploy parity.

### Next step
Deploy this second continuity fix, rerun the live founder recall probe, then continue on BuilderOS UI execution/progress visibility issues.

## [BUILD] Update 2026-06-27 — Founder continuity hardening (user-scoped memory + thread recall guard)

### What happened
- **Live founder continuity probe failed in the exact way Adam warned about.** Turn 1: chair acknowledged a thread-only phrase (`iron-harbor-...`) correctly. Turn 2: “What exact phrase did I just ask you to remember for this thread?” answered from `verified_search` instead of thread context.
- **Two defects caused it.** `routes/lifeos-builderos-command-control-routes.js` built prompt context through `loadLuminMemory()` with a hardcoded `adam` lookup instead of the active request user. Separately, `services/chair-program-direct-answer.js` allowed thread-referential questions to short-circuit into the direct factual-search path whenever a search block existed.
- **Fix shipped locally.** `services/lumin-chair-orchestrator.js` now passes `userId`/`userHandle` into `loadChairMemoryContext()`. The route memory loader now resolves the active user when building prompt context. The direct factual-answer fast path now refuses recall-style prompts when `recent_thread` exists, forcing the chair to answer from thread continuity instead of web-search theater.

### Verification
- `node --test tests/chair-program-direct-answer.test.js tests/lumin-chair-orchestrator.test.js` → PASS
- `node --test tests/chair-direct-connection-truth.test.js tests/lumin-conversation-routing.test.js` → PASS
- Live pre-fix probe documented: first turn stored phrase, second turn incorrectly answered from `verified_search`.

### Next step
Push/deploy the continuity fix, rerun the live founder memory probe, then continue driving BuilderOS through the founder UI path until the next autonomous-build blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder Point B execute routing hardening

### What happened
- **Founder-path live probes exposed misrouting inside the Chair path.** `what is point b right now?` correctly returned `point_b_status`, but `do: continue building toward point b...` also returned `point_b_status` instead of executing the machine path, and `do: build the next blueprint step for PRODUCT-LIFERE-OS-V1-0001...` degraded into `build_terminal` with `INTENT_AMBIGUITY`.
- **Intent classification tightened in three places.** `services/chair-intent-signals.js` now recognizes “build/run/execute the next blueprint step” and product-scoped “next step” phrasing as blueprint execution. `services/lifeos-mission-pipeline-executor.js` now recognizes “continue/advance toward Point B”, “next required step”, and “receipt scan only” phrasing as mission-pipeline intents. `services/lumin-chair-system-actions.js` narrowed `point_b_status` matching to explicit status phrasing only.
- **No product claims upgraded yet.** This is routing hardening only. Live deploy proof and founder-interface re-run are still required before calling the Point A→B slice reliable.

### Verification
- Local intent probes now classify:
  - `what is point b right now?` → `point_b_status`
  - `do: continue building toward point b...` → not a system-action status read
  - `do: build the next blueprint step...` → blueprint execute intent
- Targeted routing/truth test suites pass locally.

### Next step
Commit the routing hardening with matching Amendment 21 receipt/manifest updates, push via clean worktree, wait for Railway SHA parity, then rerun the live founder-interface prompt battery before certifying the founder A→B machine path.

## [BUILD] Update 2026-05-13 — OVERNIGHT GOVERNANCE Cycle 4

### What happened
- **SIS1 mechanism confirmed.** `task_skip_already_shipped` events found in the queue log (not daemon log). Cycle 180 fired at 03:07:20 UTC on `site-builder-pipeline-report-route`; cycle 181 fired at 03:52:22 UTC on `site-builder-discovery-run-action`. Forge cursor now at pos 0 = `site-builder-postmark-send`. SIS1 is operating correctly — one more cycle (~04:37 UTC) will confirm the original RL1 target task specifically.
- **`tc-webhook-validator.js` audited: complete, not a stub.** 34 lines, both `validatePostmark` (HMAC-SHA256) and `validateTwilio` (HMAC-SHA1) fully implemented with timing-safe compare, graceful unconfigured-key skip. Clean `node --check`. No rebuild.
- **package.json guard regression test shipped.** `tests/deployment-service-package-guard.test.js` — 6 tests, all pass. Guard now self-protecting: file added to `REQUIRED_TEST_FILES` in `deployment-service.js` and to `package.json` test script.

### Verification
- `npm test`: **14 pass, 0 fail, 4 skipped** (4 smoke tests require live server)
- All 6 guard contract tests pass
- `node --check services/tc-webhook-validator.js`: PASS
- `node --check services/deployment-service.js`: PASS

### Next step
Watch for `task_skip_already_shipped site-builder-postmark-send` in `data/builder-continuous-queue-log.site-builder-autonomous-queue.jsonl`. When it appears, mark SIS1 fully confirmed and clear the PENDING_CONFIRMATION row in AM36 receipts. Then roadmap slice.

---

## [BUILD] Update 2026-05-13 — OVERNIGHT GOVERNANCE Cycle 3

### What happened
- **Test script stripped again** after pulling 3 new Railway commits. Fixed in `0071d8cd`. This has now happened 3+ times — root cause is Railway builder templates generating a 2-file test script.
- **package.json protected-scripts guard shipped** (`d1c72926`). Added content-aware check to `commitToGitHub` in `services/deployment-service.js`. Any commit to `package.json` that removes `repo:sync-check`, `lifeos:verify:ui-map`, or the 3 regression test files is rejected with a descriptive error. PROVISIONAL — monitored.
- **TC Stripe service rebuilt** via `POST /api/v1/lifeos/builder/build`. Was 24-line truncated stub (ended mid-sentence). Now 90 lines with complete Stripe integration. `ok:true committed:true`.
- **SIS1 still PENDING_CONFIRMATION**. Forge cursor at pos 10, expected to fire at pos 0 (`site-builder-postmark-send`) within the next two Forge cycles (~04:37 UTC).
- **Nova throughput confirmed healthy**: 2 commits/cycle (CSS/HTML), cycles 194–196 all clean.

### Verification
- `npm test`: 8/8 pass
- Compliance: 12/12 pass
- `node --check services/tc-stripe-service.js`: PASS (90 lines)
- `node --check services/deployment-service.js`: PASS

### Next step
Confirm SIS1. Then tc-webhook-validator quality review. Then post-commit smoke router.

---

## [FIX] Update 2026-05-13 — GOVERNANCE_LOCK_CONTINUOUS_OPERATION cycle 1

### What happened
- **Repo sync gap discovered and closed.** Local was 32 commits behind `origin/main` (Railway autonomous builders had been pushing while we were working on SC1). `git pull --rebase origin main` applied cleanly — zero file conflicts.
- **13 working-tree files were never pushed to git.** Created during RL1/RL2/OF1/RRS1/OD1 sessions, these scripts, test files, and mockups existed only in the stash: `scripts/operator-runtime-status.mjs`, `scripts/generate-operator-dashboard-json.mjs`, `scripts/generate-runtime-reality-snapshot.mjs`, `scripts/repo-sync-check.mjs`, `scripts/lib/git-origin-alignment.mjs`, `scripts/verify-dashboard-ui-map.mjs`, `services/site-builder-postmark-helper.js`, 3 test files, 3 mockup docs. All committed and pushed as `c60e1c64`.
- **SIS1 status unchanged.** Still PENDING_CONFIRMATION — Forge cursor at position 9, not yet wrapped to position 0 (`site-builder-postmark-send`). Cannot confirm Railway instance from local logs.

### Verification
- `npm test`: 8/8 pass, 0 fail
- Compliance: 12/12 pass (all 8 critical + 4 advisory), `exit_fail=false`
- `git push origin main`: clean push, head now `c60e1c64`

### Decision rule applied
Pull + recovery was low-risk, reversible, non-constitutional, directly restored repo truth → AI Council approved and implemented without Adam per GOVERNANCE_LOCK_CONTINUOUS_OPERATION protocol.

### Blockers unchanged
- `tc-stripe-billing-service` quarantine (`fail_closed=2`) — operator decision needed
- SIS1 PENDING_CONFIRMATION — Forge cursor must wrap to pos 0 for log event
- Mission Control / Mechanic / Sentinel daemons — §2.12 gate not cleared

### Next smallest safe step
Run `npm run operator:status` to confirm FRESH snapshot after push. Then watch for `task_skip_already_shipped` event in Forge log when cursor wraps.

---

## [BUILD] Update 2026-05-12 — SC1 compliance receipt severity persistence

### What changed
- **`scripts/tsos-compliance-officer.mjs`** — `writeReceipt()` now adds `severity: "critical"` or `severity: "advisory"` to each step before writing `data/tsos-compliance-officer-last-run.json`. Purely additive — zero logic change.
- **Mixed-scope recovery (operator-approved waiver):** 5 prior unstaged hunks also committed in the same diff: JSDoc header updates, `import { writeOperatorDashboard/writeRuntimeRealitySnapshot }`, `repo:sync-check` conditional block, `lifeos:verify:ui-map` step, post-receipt snapshot/dashboard writes. All were already running on disk.
- **`docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md`** — SC1 Change Receipt row added.
- **`docs/CONTINUITY_LOG_LIFEOS.md`** — this entry.

### Verification results
- `npm run tsos:compliance-officer`: 12/12 pass (8 critical + 4 advisory), `exit_fail=false`, `local_critical_fail=false`
- `npm test`: 8 pass, 0 fail
- `operator:status`: snapshot FRESH (4s), `fail_closed=2` (pre-existing `tc-stripe-billing-service`, unchanged)
- `data/tsos-compliance-officer-last-run.json`: 12/12 steps have `severity` field — VERIFIED

### Hunk audit note
Pre-commit hunk audit rule detected the mixed-scope condition before staging. Reported to operator. Operator issued explicit written waiver approving the combined commit. This confirms the rule is working. Future mixed-scope commits still require STOP + approval.

### What stays blocked
- RL4 (`tc-stripe-billing-service` repair) — FAIL_CLOSED gate not waived
- Mission Control / Mechanic / Sentinel daemons — §2.12 council vote required
- Post-commit smoke router — SIS1 confirmation still pending (check Forge log for `task_skip_already_shipped` after 22:15 UTC)

### Next live check
Did Forge log `task_skip_already_shipped` after 22:15 UTC? If yes: SIS1 confirmed. If no: deployment/runtime alignment is the next repair.

---

## [BUILD] Update 2026-05-12 — NSSOT §2.10 ¶8–10 constitutional clarification

### What changed
- **`docs/constitution/NORTH_STAR_SSOT.md`** version updated to 2026-05-12; three paragraphs added to **§2.10** after ¶7 (no existing text removed or weakened):
  - **¶8 Audit epistemic format** — every audit finding must be classified VERIFIED/KNOW, THINK, or UNKNOWN; blending tiers or implying states without evidence is a §2.6 violation.
  - **¶9 Improvement-idea council rule** — improvement brainstorming is a separate phase from auditing; up to 25+25 ranked ideas; smallest winning slice; no implementation while `FAIL_CLOSED` or `PENDING_CONFIRMATION` unresolved without a receipted operator waiver.
  - **¶10 Truth-first order** — audit → ideas → vote/rank → implement, non-collapsible, non-reorderable; skipping or reordering is a §2.6 violation.
- **`docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md`** — Last Updated + Change Receipts row added.
- **`docs/CONTINUITY_LOG_LIFEOS.md`** — this entry.
- `npm test`: 8 pass, 0 fail (unchanged by this constitutional edit).

### Why
Adam requested these three clarifications be codified as law to prevent: (1) audits that blend KNOW/THINK/UNKNOWN into a single verdict, (2) improvement ideas being generated before or simultaneously with audits, and (3) implementation starting while FAIL_CLOSED or PENDING_CONFIRMATION states are active.

### Next
- Active FAIL_CLOSED wound: `tc-stripe-billing-service` quarantine (UNKNOWN_TRUNCATION_CLASS per SF1). Must resolve before any new implementation slice unless operator issues explicit waiver receipt.
- SIS1 PENDING_CONFIRMATION still unresolved — see Amendment 36 Change Receipts.

---

## [BUILD] Update 2026-05-11 #2 — Privacy & AI governance SSOT wired (navigation only)

### Doc / SSOT
- **`docs/projects/AMENDMENT_40_PRIVACY_MENTAL_SOVEREIGNTY.md`**, **`docs/AI_MANAGEMENT_SYSTEM_SSOT.md`** — now linked from **`docs/projects/INDEX.md`**, **`docs/LIFEOS_PROGRAM_MAP_SSOT.md`**, **`docs/QUICK_LAUNCH.md`** LifeOS lane, and **`docs/products/lifeos/PRODUCT_HOME.md`** (**Constitutional LifeOS UX SSOT** bullet **4**, **Agent Handoff** row, **Change Receipts**).
- Cross-cutting receipt: **`docs/CONTINUITY_LOG.md`** — **[BUILD] Update 2026-05-11 #8**.

### Next
- Product work unchanged: follow **Agent Handoff** for modes v1 / queue; when shipping **voice, ambient, ranking, or commerce-adjacent** surfaces, implement consent + **manipulation firewall** disclosure fields per Amendment 40 + AI Management SSOT (still **⚠️ INCOMPLETE** until `verify-*` hooks exist).

---

## [BUILD] Update 2026-04-29 #1 — **Overnight dashboard: `dashboard-theme-foundation` + receipts**

### Shipped / verified (system path)
- **`public/shared/lifeos-dashboard-tokens.css`** — **`POST /api/v1/lifeos/builder/build`** via **`npm run lifeos:builder:overnight -- --task dashboard-theme-foundation`** (`claude_via_openrouter`, **`committed:true`**). Prod **`GET /shared/lifeos-dashboard-tokens.css`** **200**, **2607** bytes (= local).

### Related platform (local amendment of prior gap)
- **`routes/lifeos-council-builder-routes.js`** — **`mirrorCommittedContentToRepoRoot`** after **`autoWireRoute`** register commit (**chained **`files[]`** FS parity).

### Doc / SSOT
- **`docs/products/lifeos/PRODUCT_HOME.md`** — receipts + **`## Agent Handoff Notes`**: next **`dashboard-import-tokens`**. **`docs/CONTINUITY_LOG.md`** **`[BUILD]`** block.

### Next
- **`npm run lifeos:builder:overnight -- --task dashboard-import-tokens`** (minimal `<link>` in **`lifeos-dashboard.html`**).

---

## [BUILD] Update 2026-04-27 #18 — Victory Vault root API contract now exists on the runtime spine

**Shipped:**
- `routes/lifeos-victory-vault-routes.js` — top-level LifeOS compatibility router for POST/GET `/api/v1/lifeos/victories` and POST/GET `/api/v1/lifeos/victories/reels`, backed by the existing `createVictoryVault()` service and `makeLifeOSUserResolver()`.
- `startup/register-runtime-routes.js` — imports + mounts the new router at `/api/v1/lifeos` and logs the mount distinctly from `/api/v1/lifeos/growth`.
- `scripts/lifeos-verify.mjs` — route inventory now fails if `routes/lifeos-victory-vault-routes.js` disappears.

**State after this session:**
- Live diagnosis before fix was concrete: `GET /api/v1/lifeos/victories?user=adam` returned `404`, while `GET /api/v1/lifeos/growth/victories?user=adam` returned `200`.
- Lumin build bridge was used for reconnaissance first: `/api/v1/lifeos/chat/build/plan` correctly identified the Victory Vault mismatch as the highest-value LifeOS defect, but its plan text truncated and the draft suggested a weaker proxy pattern.
- The council builder then produced the actual runtime fix. After Railway redeployed, both `GET /api/v1/lifeos/victories?user=adam` and `GET /api/v1/lifeos/victories/reels?user=adam` returned `200`.

**Next:** Run the builder HTML smoke on a real LifeOS target, then do the household invite E2E flow. After those verification items, the next real product build is the first vertical slice of Commitment -> execution desk.

---

## [BUILD] Update 2026-04-26 #17 — LifeOS build lanes now obey Memory Intelligence authority

**Files changed:**
- `services/lifeos-lumin-build.js` — plan/draft now consult Memory Intelligence routing before selecting a model; blocked tasks fail closed instead of silently falling back.
- `routes/lifeos-gate-change-routes.js` — gate-change debate persists structured debate memory and filters unauthorized models before council runs.
- `startup/register-runtime-routes.js`, `routes/memory-intelligence-routes.js` — `/api/v1/memory/*` mounted into runtime so LifeOS lanes can log debates, intent drift, authority, and violations.
- `docs/SSOT_COMPANION.md`, `docs/products/memory-intelligence/PRODUCT_HOME.md` — future-back and anti-corner-cutting rules now part of the operating law, not just the brainstorm brief.

**State after this session:**
- Lumin plan/draft and gate-change flows now use the same evidence/routing system instead of static model preference only.
- Debate memory is structured enough to preserve consensus, residue risk, and future-back notes for later retrieval.
- What is still missing: automatic CI/build receipts into Memory Intelligence and broader LifeOS route adoption beyond these load-bearing lanes.

**Next:** Seed Memory Intelligence with real facts from SSOT receipts, then wire verifier outcomes from Lumin/build flows into `fact_evidence` so routing quality improves from actual outcomes.

---

## [BUILD] Update 2026-04-20 #16 — Cycle tracking + Habits overlays

**Shipped:**
- `public/overlay/lifeos-cycle.html` — Today tab (phase ring badge, colour per phase, energy chips, countdowns), Log tab (entry type, datetime, flow level, symptom tags, notes), History tab (past cycles with entry pills, avg length), Settings tab (avg cycle/period length, tracking toggle, perimenopause mode, notify). Resolves numeric `user_id` via `GET /api/v1/lifeos/users/:handle` at boot.
- `public/overlay/lifeos-habits.html` — Today tab (stats bar, identity-framed habit list, check-in buttons, streak badges, reflection prompts for struggling habits), Manage tab (create new habit with title + identity statement + frequency; full habit list).
- `public/overlay/lifeos-app.html` — PAGE_META entries for both new overlays; sidebar nav items under "Self" group (after Growth); More bottom sheet entries.

**Next:** Smoke test — log in, open Cycle, verify phase loads (needs `cycle_entries` row; quick-log period start). Open Habits, create a habit, check it in, confirm streak increments next day. E2E invite link + Sherry registration still pending from prior handoff.

---

## [BUILD] Update 2026-04-21 #15 — Low-power ambient context + voice background suspend

**Shipped:** Opt-in coarse device hints (`battery`, `network_type`, `visibility`, timezone, PWA standalone) stored in `lifeos_ambient_snapshots`; API `/api/v1/lifeos/ambient/snapshot` + `/recent` (no AI on ingest); client `lifeos-ambient-sense.js` with 10–20 min cadence while the shell is visible; Settings toggle persists `lifeos_ambient_sense=1`. Lumin `buildContextSnapshot` includes `ambient_hints`. Always-on voice in `lifeos-voice.js` now **releases the mic** when the tab is hidden and skips screen wake lock on touch-first devices by default (`LuminVoice.configure`).

**Files:** `db/migrations/20260423_lifeos_ambient_snapshots.sql`, `services/lifeos-ambient-context.js`, `routes/lifeos-ambient-routes.js`, `startup/register-runtime-routes.js`, `public/overlay/lifeos-ambient-sense.js`, `public/overlay/lifeos-app.html`, `public/overlay/lifeos-voice.js`, `services/lifeos-lumin.js`, `scripts/lifeos-verify.mjs`, `docs/products/lifeos/PRODUCT_HOME.md`, `docs/products/lifeos/FILE_MANIFEST.json`, `docs/products/project-governance/PRODUCT_HOME.md`

**Next:** Apply migration on Neon (boot auto if migrations run at deploy). Smoke: enable ambient in Settings → wait one interval or trigger tab switch → confirm `GET /api/v1/lifeos/ambient/recent?user=` returns rows. **THINK:** continuous environmental *audio* capture is a separate product slice (VAD, consent, cost) — not this ship.

---

## [BUILD] Update 2026-04-20 #14 — Household invite links + admin Settings + auth UX

**Shipped:** Shareable signup URLs from API; admin creates/copies in shell Settings; login accepts `?code=` or `?invite=`; JWT role/tier synced for admin gate; sign-out clears tokens; Lumin contract line for optional context-grounded relational prompts (no fake “always listening” claims).

**Files:** `routes/lifeos-auth-routes.js`, `public/overlay/lifeos-app.html`, `public/overlay/lifeos-bootstrap.js`, `public/overlay/lifeos-login.html`, `services/lifeos-lumin.js`, `prompts/lifeos-lumin.md`, `docs/products/lifeos/PRODUCT_HOME.md`

**Next:** E2E test: admin creates invite → open copied link in private window → register Sherry (or test user) → confirm `lifeos_role` admin panel appears for adam only.

---

## [BUILD] Update 2026-04-19 #13 — Persistent Lumin drawer + global voice

**Problem fixed:** Lumin chat was buried in navigation; no visible chat box; voice only existed inside `lifeos-chat.html`; no always-listening mode.

**Files changed:**
- `public/overlay/lifeos-app.html` — FAB button (◎, always visible), slide-in Lumin drawer (desktop: right panel; mobile: bottom sheet), always-on voice toggle in both toppbars (🎙), live interim transcript preview, "Full history →" link
- `public/overlay/lifeos-voice.js` — NEW: shared voice utility (`LuminVoice.startForInput`, `LuminVoice.toggleAlwaysListen`, auto-inject mic icons on `data-voice="true"` inputs)

**Behavior:**
- Tap ◎ anywhere → Lumin drawer opens with last conversation loaded
- Tap 🎙 in topbar → always-on mode: everything you say sends to Lumin automatically (800ms pause triggers send)
- Speak → live transcript shows as you talk; drawer auto-opens
- "Full history →" navigates to `lifeos-chat.html` for full thread browser
- `data-voice="true"` on any input/textarea across overlays auto-gets a mic icon

**Next:** Add `data-voice="true"` to key inputs in `lifeos-today.html`, `lifeos-quick-entry.html`, `lifeos-mirror.html` so voice-to-text works everywhere.

---

## [BUILD] Update 2026-04-19 #12 — Cycle Tracking backend complete

Full cycle tracking lane shipped. Zero AI cost — pure math + SQL.

**Files created:**
- `db/migrations/20260420_lifeos_cycle_tracking.sql` — `cycle_settings`, `cycle_entries`, `cycle_phases` tables; `ALTER TABLE energy_patterns ADD COLUMN cycle_phase`
- `services/lifeos-cycle.js` — `createCycleService()` with `getSettings`, `updateSettings`, `logEntry`, `getCurrentPhase`, `getContextSnapshot`, `getCycleHistory`; `computePhase()` scales phase boundaries by `avg_cycle_length/28` ratio
- `routes/lifeos-cycle-routes.js` — POST /entry, GET /phase, GET /context, GET /history, GET /settings, PUT /settings at `/api/v1/lifeos/cycle`
- `prompts/lifeos-cycle.md` — cold-start domain context for next agent

**Files modified:**
- `startup/register-runtime-routes.js` — import + mount `createLifeOSCycleRoutes`
- `docs/products/lifeos/PRODUCT_HOME.md` — change receipt + handoff notes updated

**Next agent:** Build `public/overlay/lifeos-cycle.html` — phase badge, log entry form, energy ring, history view. All backend endpoints are live.

---

## [BUILD] Update 2026-04-19 #11 — Legacy core API shipped

Legacy P1 backend is now live: trusted contacts, check-in cadence, time-capsule messages (`deliver_at`), digital will, and completeness scoring under `/api/v1/lifeos/legacy`. Main log **Update #23**.

---

## [BUILD] Update 2026-04-19 #10 — Habits API lane shipped

New habits migration/service/routes are mounted at `/api/v1/lifeos/habits`, with streak/miss summary and reflection question logic. Main log **Update #22**.

---

## [BUILD] Update 2026-04-19 #9 — Conflict interrupt settings controls

`public/overlay/lifeos-chat.html` now exposes in-chat ON/OFF + sensitivity controls wired to `/api/v1/lifeos/conflict/interrupt/settings`; debounce checks respect disabled mode. Main log **Update #21**.

---

## [BUILD] Update 2026-04-19 #8 — Conflict interruption shipped

Migration `20260419_conflict_interrupt.sql`, service/routing methods, and chat debounce toast are live. See main log **Update #20** for exact file list and follow-up.

---

## [BUILD] Update 2026-04-19 #7 — Gate-change consensus v2

`run-council` now executes multi-model consensus + opposite-argument round on disagreement and stores `council_rounds_json` / `consensus_reached` / `consensus_summary`. Main log **Update #19**.

---

## [BUILD] Update 2026-04-19 #6 — Builder autonomy defaults

`routes/lifeos-council-builder-routes.js` now defaults `POST /task` to `autonomy_mode: "max"` with `internet_research: true`, instructing council runs to proceed with best-guess assumptions and avoid routine clarification loops. `prompts/lifeos-council-builder.md` updated. Main log **Update #18**.

---

## [BUILD] Update 2026-04-19 #5 — Gate-change API shipped

`routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-proposals.js`, migration `20260422_gate_change_proposals.sql`, `startup/register-runtime-routes.js`, `prompts/lifeos-gate-change-proposal.md`. Main log **Update #17**.

---

## [PLAN] Update 2026-04-19 #4 — §2.6 ¶8 council efficiency path (Amendment 21)

Epistemic § + receipts + Last Updated: gate-change hypotheses go to **AI Council** per Amendment 01 + Companion §5.5. Main log **Update #16**.

---

## [PLAN] Update 2026-04-19 #3 — §2.6 mandatory / no corners (Lumin + Amendment 21)

`services/lifeos-lumin.js` — `LUMIN_EPISTEMIC_CONTRACT` states rules are not optional for speed; JSDoc “Article II” typo fix. Amendment 21 epistemic § + receipts + handoff **Known gaps** note (§2.6 enforcement still agents+CI). Full cross-doc list: main `docs/CONTINUITY_LOG.md` **Update #15**.

---

## [BUILD] Update 2026-04-19 #2 — Amendment 36 handoff stack

Zero-drift protocol, per-lane logs, `docs/AI_COLD_START.md`, builder `GET /next-task`, and governance scripts shipped. See main `docs/CONTINUITY_LOG.md` **Update #6** for the full file list and `docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md` for rules.

---

## [BUILD] Update 2026-04-19 #1 — SSOT hygiene + INDEX (reference)

### Summary
Full file list and revenue-alignment edits for Amendment 21 / INDEX / `callAI` boot fix are recorded in main `docs/CONTINUITY_LOG.md` under **Update 2026-04-19 #3**. Use that entry for receipts until LifeOS-only sessions are logged here exclusively.

### Next agent (LifeOS lane): start here
1. `prompts/lifeos-conflict.md` → **Next Approved Task** (Conflict Interrupt System).
2. `prompts/lifeos-lumin.md` → engagement feedback on reactions.
3. Read `docs/products/lifeos/PRODUCT_HOME.md` → `## Agent Handoff Notes` + last 3 rows of `## Change Receipts`.

---
