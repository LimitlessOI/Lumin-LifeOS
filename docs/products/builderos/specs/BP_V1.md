<!-- SYNOPSIS: BUILDEROS_BP_V1 — executable Version-1 blueprint: close the build loop (L0) + turn on the five recorders -->

# BuilderOS — BP Version 1 (Close the Loop)

**Status:** `EXECUTABLE BLUEPRINT — V1 (ARC-revised, code-grounded, execution-deterministic)`
**Owner:** Adam · **Governs under:** `docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md`
**Reality reference:** `docs/products/builderos/TWIN.md` (digital twin of actual code)
**Last Updated:** 2026-06-28 (ARC translation pass over SNT attack report)

> **ARC note:** This revision incorporates the SNT attack report. Accepted findings became blueprint changes (below). Two findings were **intent gaps ARC may not invent** and are returned to the founder (see "Returned to founder"). The contract-honesty fix (SNT-1) and gate-hardening (SNT-2) are promoted to the FRONT of the sequence — no other step can be trusted until the proof contract fails closed.

### Returned to founder (`BLOCKED_RETURN_TO_IDC` — ARC may not invent intent)
- **Lexical priority (SNT-7):** FP V3 names both "Mission is the only sacred cow" and "trust is the highest priority." When closing-fast conflicts with proving-trust, which wins? ARC needs an explicit ordering (proposed default: *fidelity > trust > speed > cost*) before it can resolve trade-offs deterministically.
- **Reality adjudicator (SNT-8 / Open Decision #2):** founder/twin delegation scoring is unfalsifiable without a defined outcome adjudicator + horizon + sample size. ARC marks §I.3 delegation **NON-OPERATIONAL** until ruled.

## Objective (the only thing V1 must achieve)

> **The builder builds the builder, and the builder builds our projects — through one governed path, proven LIVE.**

This is **L0** from FP V3 §III.5. Per FP V3 §0.1 (inert-until-L0), this is the only BuilderOS build work authorized until the loop is proven. Nothing from L1–L6 or §III.7 may start until V1 passes — except the Five Recorders (V1-00), which are explicitly permitted because their value is unrecoverable if deferred.

**Point B for V1:** Adam issues a build from the founder interface; it reaches a verified **LIVE** state (not commit-only); the same path works whether the target is BuilderOS itself or a product; every step emits an owned Reality Record. Then Point B (`PRODUCT-LIFERE-OS-V1-0001`) closes with founder confirmation.

**The one invariant (FP V3 §III.2 / §IV):** self-modification uses the *same* governed, proven, LIVE-reaching path as everything else; every action is recorded as an owned Reality Record with `expected_outcome` vs `actual_outcome`. No `if target == builder` special case.

---

## Verified starting state (from the twin, 2026-06-28)

| Blocker | Evidence | Owner code |
|---|---|---|
| Build ends `COMMIT_ONLY_NOT_LIVE` | `BUILDEROS_FOUNDER_UI_PROOF.json` | `services/build-proof-contract.js` |
| `MISSING_TIER_LOCK` | `same-tier-determinism` FAIL | `scripts/run-builderos-same-tier-determinism.mjs` |
| Memory `WIRED` not `LIVE` | not a proof source | `services/self-repair-memory.js`, `routes/memory-status-routes.js` |
| Point B `founder_usability_pass:false` | `BP_PRIORITY.json` | `services/founder-usability-confirm.js` |

---

## Steps (ordered; each is one governed mission step)

### V1-00 — Turn on the Five Recorders (instrument now)
**Intent:** Start capturing the unrecoverable history before the systems that consume it exist (FP V3 §III.6).
**Targets (pinned):** new `services/reality-ledger.js` exporting `appendRealityRecord(record)` that appends one JSON object per line (JSONL) to `data/reality-ledger/records.jsonl` (create dir if absent); call it from the existing receipt write paths under `products/receipts/`; extend `services/self-repair-memory.js`; founder records under `data/twins/default/adam/`.
**Edits:**
- Every receipt already written → also append one **Reality Record** (`id,type,statement,evidence,confidence,owner,expected_outcome,actual_outcome,lifecycle,cause_of_death`) to one **append-only** store. *(ARC/SNT-9: the record **shape** is the irreversible decision and ships now; cryptographic hash-chaining is a non-breaking post-L0 upgrade — do not add chaining to an unproven write path.)*
- Stamp **`owner` + `expected_outcome` + `actual_outcome`** on every build/repair action.
- Record **cause_of_death** when anything is retired/quarantined.
- Log **founder judgment** records (situation → call → rationale) into `data/twins/default/adam/`.
- Seed the **SNT attack corpus** as a versioned append store; snapshot **capability per `gap:families`**.
**Acceptance:** unit test proving each receipt also lands as an append-only Reality Record with owner+expected+actual; `builderos:harness:audit` still green.
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-00B — Make the transport contract fail closed (SNT-1) — **must precede everything else**
**Intent:** The proof contract must never call "committed but not live" a success. This is the truth boundary; if it lies, every downstream gate inherits the lie.
**Exact anchor (verified 2026-06-28):** `services/build-proof-contract.js` — line **36** `return { ok: true, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: null };` and the identical fallback at line **44**.
**Exact edit:** change both returns to `return { ok: false, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: 'COMMIT_ONLY_NOT_LIVE' };`. (`LIVE_BEHAVIOR_NOT_VERIFIED` at L33 is already `ok:false` — leave it.) Function signature/other branches unchanged.
**Consumer audit (mandatory, deterministic):** `rg -n "evaluateBuildProof\(" --type js` → reconcile every caller that reads `.ok`. **Verified-safe (do not change):** `scripts/run-builderos-build-deploy-truth.mjs` L104 already double-guards (`proof.ok === true && /DEPLOY_SYNC_PASS|LIVE_BEHAVIOR_PASS/`); the founder-build poll route gates on `transport_status` regex (command-control-routes L1001–1002), not raw `.ok`. Any caller that gates on raw `.ok` alone for a deploy-required action must be made to require `DEPLOY_SYNC_PASS|LIVE_BEHAVIOR_PASS`.
**Targets:** `services/build-proof-contract.js`, new `tests/build-proof-contract.test.js`.
**Acceptance (exact):** `node --test tests/build-proof-contract.test.js` where the test asserts `evaluateBuildProof({codeChanging:true,deployRequired:true,commitSha:'x',originContainsCommit:true}).ok === false` and `evaluateBuildProof({codeChanging:true,deployRequired:true,commitSha:'x',originContainsCommit:true,deployMatchesOriginMain:true}).ok === true`.
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-00C — Harden the founder-UI acceptance gate (SNT-2)
**Intent:** The E2E `drawer_direct_build` check must prove a build *finished live*, not merely *started*.
**Exact anchor (verified):** `scripts/run-real-app-e2e.mjs` L275 `const looksExecuted = /PASS|RUNNING|COMMIT|Command:\s*COMMAND_RAN|Build job/i.test(reply);` — passes on `RUNNING`/`Build job`/`COMMIT`.
**Verified poll contract:** `GET /api/v1/lifeos/builderos/command-control/founder-interface/build-job/:jobId` (command-control-routes L968) returns terminal status ∈ {`completed` (live, `ok:true`), `waiting_for_proof` (committed-not-live), `failed`} and `RUNNING`→HTTP 202 while in flight.
**Exact edit:** (1) strip `RUNNING|Build job|COMMIT` from the regex so a start-only reply no longer passes; (2) obtain the `jobId`, poll the endpoint above until status leaves `running`, and `pass('drawer_direct_build', …)` **only** when `status === 'completed'` (live); `waiting_for_proof` and `failed` → `fail(...)`.
**⚠️ One discovery anchor to pin at execute-time (the only unpinned hop):** how `jobId` surfaces to the browser client — read the founder-interface message handler in `routes/lifeos-builderos-command-control-routes.js` (`/founder-interface/message`) + the lumin client in `public/overlay/lifeos-app.html` to confirm whether the job id is in the reply payload or a network response. Everything downstream of the id is pinned above.
**Targets:** `scripts/run-real-app-e2e.mjs`, `scripts/run-builderos-founder-ui-proof.mjs`.
**Acceptance (exact):** a reply of `"Build job started"` with no terminal `completed` poll → `drawer_direct_build` **FAIL**; a job polled to `status:'completed'` → PASS.
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-01 — Two-phase transport: COMMIT (sync) → LIVE (async) — **mostly already built (SNT-6 corrected)**
**Loop correction (verified):** the two-phase machinery already exists — the founder build-job route resolves `completed` (live) vs `waiting_for_proof` (committed-not-live) via `refreshFounderBuildResultTruth` (command-control-routes L995–1014). So V1-01 is **not new construction**; it is: (a) the V1-00B contract fix, plus (b) verifying the async resolver reaches `DEPLOY_SYNC_PASS`/`LIVE_BEHAVIOR_PASS` post-deploy, plus (c) confirming the synchronous founder reply states the honest phase ("committed; live-verify pending job N").
**Targets:** `services/build-proof-contract.js` (via V1-00B), `routes/lifeos-builderos-command-control-routes.js` (verify resolver), `scripts/run-builderos-build-deploy-truth.mjs` (already L104-guarded).
**Acceptance (exact):** `npm run builderos:autonomy-closure:build-deploy-truth` → `verdict:"PASS"` only with `transport_status ∈ {DEPLOY_SYNC_PASS, LIVE_BEHAVIOR_PASS}`; a commit-only state yields `verdict:"FAIL"` (now reinforced by V1-00B).
**On block:** `BLOCKED_RETURN_TO_ARC` with the exact `transport_status` observed.

### V1-02 — Lock the single transport actuator — **convergence already exists (SNT-5 corrected)**
**Loop correction (verified):** there is **no `if target == builder` branch** to remove — that was a phantom. Both live executors already POST the one actuator `POST /api/v1/lifeos/builder/build`: `services/builderos-canonical-executor.js` `postBuilderBuild` L92–93, and `services/builderos-governed-loop-executor.js` `dispatchBuilderPlan` L118–120. The worktree path `executeCanonicalWorktreeStep` (canonical-executor L272–295) runs `builder-supervisor.js` **`--dry-run` only — it cannot commit.** The manifest (L297–312) already names primary/secondary/governed and freezes `DEPRECATED_PATHS` (L22–26).
**Exact edit:** do **not** refactor; **lock** the invariant with a guard test + a Twin assertion. The test must assert: (1) `builderos-canonical-executor.js` and `builderos-governed-loop-executor.js` each reference exactly `'/api/v1/lifeos/builder/build'` as the dispatch URL; (2) `executeCanonicalWorktreeStep` invokes the supervisor with `--dry-run` (no commit transport); (3) no new commit-capable transport string exists outside the actuator. `target` is already a parameter (`plan.target_file`), so "self == project" holds by construction — add one assertion that a `services/builderos-*` target and a `products/*` target produce dispatch bodies that differ **only** in `target_file`.
**Targets:** new `tests/builderos-single-actuator.test.js`; `docs/products/builderos/TWIN.md` (record the locked invariant).
**Acceptance (exact):** `node --test tests/builderos-single-actuator.test.js` green; `npm run builderos:working-definition:verify` green.
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-03 — Lock the tier (kill `MISSING_TIER_LOCK`)
**Intent:** Self-modifying builds are reproducible and safe-scoped.
**Targets:** Railway env (`BUILDEROS_INTENDED_CODER_TIER`, `BUILDEROS_DETERMINISM_TEST_TIER` — set equal), `scripts/run-builderos-same-tier-determinism.mjs`, `builderos-reboot/scripts/run-determinism-mechanical.mjs`.
**Edits:** set tier-lock env via `POST /api/v1/railway/env/bulk`; confirm mechanical determinism proxy runs.
**Acceptance:** `npm run builderos:autonomy-closure:same-tier-determinism` → no `MISSING_TIER_LOCK` (mechanical proxy PASS; full cold-coder proof remains separate, labeled).
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-04 — Prove memory LIVE
**Intent:** Lessons feed back so the builder can improve the builder.
**Exact anchor (verified):** the route already exists — `GET /api/v1/lifeos/command-center/memory/status` (`routes/memory-status-routes.js` L10, `requireKey`). The gap is that it is **not yet an approved proof source**.
**Targets:** `services/builderos-system-alpha-readiness.js` (proof-source set), `services/self-repair-memory.js`.
**Exact edit:** add the memory-status route to the approved proof-source set, verify a runtime-proven memory event post-deploy, and route improvement-loop `blueprint_delta` items into the same `/api/v1/lifeos/builder/build` queue.
**⚠️ One discovery anchor to pin at execute-time:** the exact proof-source array/const name inside `services/builderos-system-alpha-readiness.js` (grep `proof_source`/`PROOF_SOURCES`/`memory`); add the route there.
**Acceptance (exact):** memory maturity flips `WIRED`→`LIVE` in alpha-readiness with a live event; `npm run builderos:working-definition:verify:operational` reflects it.
**On block:** `BLOCKED_RETURN_TO_ARC`.

### V1-05 — Founder-live close on Point B
**Intent:** First product proven end-to-end through the loop, with the human gate.
**Targets:** `scripts/run-real-app-e2e.mjs` (`drawer_direct_build`), `services/founder-usability-confirm.js`, `public/overlay/lifeos-app.html`.
**Edits:** depends on **V1-00B + V1-00C + V1-01** (hardened gate + two-phase LIVE proof); founder usability confirm path works (≥12-char quote, human-only). Re-verify Point B proximity from live state — do **not** carry the stale "one confirm away / ~90%" claim (SNT-10); restate from current proof.
**Acceptance:** `npm run builderos:autonomy-closure:founder-ui-proof` → PASS (16/16 incl. hardened `drawer_direct_build`); Adam sets `founder_usability_pass:true` via the confirm path → `BP_PRIORITY.json` Point B complete.
**On block:** `BLOCKED_RETURN_TO_ARC` (mechanical) or surface to Adam (founder confirmation only).

---

## V1 Definition of Done (loop closed)
All green together: **proof contract fails closed** (V1-00B — commit-only is `ok:false`) · **hardened founder gate** (V1-00C — no pass on "started") · `build-deploy-truth` reaches **LIVE via two-phase proof** · `same-tier-determinism` (no tier-lock miss) · `working-definition:verify:operational` (memory LIVE) · `founder-ui-proof` (16/16) · **all governed builds converge on one transport actuator** (V1-02; any non-converged path quarantined) · Point B `founder_usability_pass:true` · every step emitted owned (append-only) Reality Records. At that point L1 (trace-driven repair) may begin.

## Sequencing clauses
- **Inert-until-L0:** no L1–L6 / §III.7 work starts until DoD passes (FP V3 §0.1). Exception: V1-00 recorders.
- **Reality = Twin:** every file changed here updates `docs/products/builderos/TWIN.md` in the same action.
- **Twin must stay synced:** after each step, reconcile the twin's §1–§7 to the new code state.
- **Queue vs blueprint:** the queue selects the next mission; the mission packet and blueprint remain the only execution authority.
- **Founder pushback required:** if founder language creates an engineering mistake, false coupling, or load-bearing ambiguity, the system must challenge it before blueprint freeze instead of implementing around it.
- **Queue-state sync required:** queue movement, mission receipts, objective verdicts, and product-local history must be co-updated in the same governed action or the run is incomplete.

## Determinism contract ("any agent builds the same house")
This BP is execution-deterministic. Every step names an **exact file + exact line/anchor + exact edit + exact pass command**.

**Discovery anchors — CLOSED (2026-06-28 code read):**
1. **jobId surfacing (V1-00C):** `services/lumin-chair-orchestrator.js` L687–714 returns HTTP **202** with `job_id` + `poll_url: /api/v1/lifeos/builderos/command-control/founder-interface/build-job/${jobId}`. Client poll: `public/overlay/lifeos-app.html` L3392–3407 (`pollFounderBuildJob`) invoked from L3476–3479 when `res.status === 202 && data.job_id`. E2E inherits terminal result via client-side poll (330s wait in `sendLuminBuildMessage`).
2. **Memory proof source (V1-04):** `services/builderos-system-alpha-readiness.js` memory component `runtime_proof` array (component_id `'memory'`, ~L230). Add `proofSource('GET /api/v1/lifeos/command-center/memory/status', …)` as first entry. Route already live at `routes/memory-status-routes.js` L10.

**Remaining founder-gated (not execution blockers):**
- Founder decision #3 (lexical priority): proposed *fidelity > trust > speed > cost*
- Founder decision #2 (reality adjudicator): blocks delegation only

## Change Receipts
| Date | What | Why |
|---|---|---|
| 2026-06-28 | BP V1 created | Executable L0 close-the-loop blueprint grounded in audit-verified code + real npm proof scripts. Steps V1-00..V1-05 map to the four verified blockers + the Five Recorders. Inert-until-L0 enforced. |
| 2026-06-28 | ARC revision (post-SNT) | Promoted contract-honesty fix to **V1-00B** and gate-hardening to **V1-00C** (front of sequence). Split V1-01 into two-phase; re-scoped V1-02 to single-actuator; Reality Record append-only now / chain later; V1-05 re-verify Point B; returned lexical-priority + adjudicator to founder. |
| 2026-06-28 | Determinism pass (SNT→ARC loop, code-grounded) | Read actual source for every target and pinned each step to exact line anchors. **Corrected two phantoms:** V1-01 two-phase machinery already exists (command-control-routes L995–1014: `completed` vs `waiting_for_proof`); V1-02 has no target-branch — both executors already POST `/api/v1/lifeos/builder/build` (canonical L92–93, governed L118–120), worktree is dry-run-only (L272–295). V1-02 became a **lock-test**, not a refactor. Contract fix pinned to `build-proof-contract.js` L36/L44; gate fix to `run-real-app-e2e.mjs` L275 + verified poll endpoint L968. Added the **Determinism contract** enumerating the only 2 discovery anchors + 2 founder decisions left open. |
| 2026-06-28 | **V1 implementation pass** | Closed discovery anchors (jobId L687–714 + client L3476; memory proof_source ~L230). Implemented: `build-proof-contract` fail-closed, `lifeos-execution-truth` transport gate, `reality-ledger.js`, tier-lock config, E2E gate hardening, single-actuator tests, memory status proof source, build-deploy-truth → Reality Record mirror. |
