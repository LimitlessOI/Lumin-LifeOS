<!-- SYNOPSIS: Prioritized task list to take FACTORY-BLUEPRINT-AUTHORITY-0001 from audit state to READY TO MANUFACTURE. -->

# FACTORY-BLUEPRINT-AUTHORITY-0001 — Task List

**State:** Phase 1 audit complete. Verdict: **NOT READY TO MANUFACTURE**.  
**Last audit commit:** `9f27d3eab`  
**Production deploy SHA:** `84f8a6440` (live as of last check)  

---

## Phase 3/4 — Enforcement spine (in progress)

- [x] Implement `scripts/lib/file-placement-gate.mjs`.
- [x] Implement `scripts/verify-file-placement.mjs`.
- [x] Wire file-placement gate as hard block in `routes/lifeos-council-builder-routes.js#commitOrMirrorFiles`.
- [x] Wire file-placement gate into `githooks/pre-commit`.
- [x] Harden step-status enforcement in `services/truth-ladder.js#exactChangeClaim`.
- [x] Harden step-status enforcement in `services/governed-shipping-runner.js`.
- [x] Harden step-status enforcement in `routes/factory-mount-routes.js` `/factory/ship-queue` and `/factory/reverse-step`.
- [x] Harden step-status enforcement in `factory-staging/factory-core/builder/run-step.js#dispatchExecuteStep`.
- [x] Verify `builder:preflight` passes (418/418).
- [ ] **Wrap `commitManyToGitHub` / `commitToGitHub` (autonomous never-stop loop) with the same `evaluateFilePlacement` + `evaluateBlueprintAuthority` gate used by `execute-batch`.**  
  *This is the highest-value next step. It prevents the `services/apiSpecification.js`-style bypass.*

---

## Phase 4 — Gating every construction path

- [ ] Gate `POST /api/v1/lifeos/builder/build` (currently no blueprint step ID required).
- [ ] Gate `POST /api/v1/lifeos/builder/execute` (single-file commit path).
- [ ] Gate `POST /api/v1/lifeos/builder/execute-batch` (file-placement block added, but verify after autonomous-loop fix).
- [ ] Gate `POST /factory/ship-queue` (already has `blueprintFollowClaim` / `exactChangeClaim`; verify no bypass).
- [ ] Gate `POST /factory/ship-queue-and-commit` / `governed-autonomous-shipping-loop.js`.
- [ ] Gate `npm run system:commit-files` (delegates to `execute-batch`; verify after gate fix).
- [ ] Gate direct `git push` / GitHub web edits (requires CI or branch protection hooks).
- [ ] Gate Railway deploy (optional: block deploy if `builder:preflight` or `lifeos:bp-priority:verify` fails).
- [ ] Gate scheduled agents (`npm run builderos:bp-priority:never-stop`).
- [ ] Gate `db/migrations/` (migration preflight + file-placement + @ssot).
- [ ] Gate `public/overlay/` customer-facing changes.

---

## Phase 5 — Sentry reality station

- [ ] Select one vertical slice (recommend: file-placement gate itself or SMOS revenue readiness).
- [ ] Load the slice's `BLUEPRINT.json`/`BUILD_QUEUE.json` into Sentry.
- [ ] Map each requirement ID to a concrete runtime assertion or browser walkthrough.
- [ ] Implement SENTRY Layer A (HTTP/structural assertions) for the slice.
- [ ] Implement SENTRY Layer B (real-browser walkthrough) for the slice.
- [ ] Require SENTRY PASS before a `BUILD_QUEUE` step can be marked `done`.

---

## Phase 6 — Reality scorecard and model trust

- [ ] Build `scripts/receipt-replay-auditor.mjs` (Receipt Auditor / Reality Replay Agent).
  - Read `OBJECTIVE_VERDICT.json`, `MISSION_*_HANDOFF.json`, `PASS` receipts.
  - Extract `commit_sha` and claimed commands.
  - Check out clean worktree at that commit.
  - Re-run the commands.
  - Compare outputs.
  - Produce `REALITY_AUDIT.json` and fail-closed seal/unseal.
- [ ] Wire `wisdom-decision-drift.mjs` to update model trust scores.
- [ ] Add CFO cost/efficiency metrics per role and model.
- [ ] Produce `REALITY_SCORECARD.md` / `.json` per cycle.

---

## Phase 7 — Continuous learning loop

- [ ] Add a scheduler that runs `builder:preflight`, `lifeos:bp-priority:verify`, `ssot-check --all`, `audit-false-done-steps --ci`, and `oil-self-repair-audit` on a cadence.
- [ ] On failure, pause `never-stop` and alert Chair/founder.
- [ ] Auto-file `DECISION-XXXX.md` for any drift requiring consensus.
- [ ] Auto-update `BP_PRIORITY.json` and the next blueprint from scorecard findings.

---

## Foundational cleanups (P0–P3 remaining debt)

- [ ] Resolve `lifeos:bp-priority:verify` migration preflight failures.
  - 13 `CREATE_TABLE_COLLISION_RISK` findings.
  - 10 `ALTER_ADD_COLUMN_MISSING_IF_NOT_EXISTS` warnings.
- [ ] Decide AMB-007: which command is the green light (`builder:preflight` vs `lifeos:bp-priority:verify` or both).
- [ ] Reduce SSOT debt from 579 missing-`@ssot` files.
  - Assign product homes to active files.
  - Mark legacy files as `GRANDFATHERED` with a baseline receipt.
- [ ] Clear 116 SOFT false-done content-drift findings or convert them to accepted baselines.

---

## Founder / role decisions required

| ID | Question | Default if no answer |
|----|----------|----------------------|
| AMB-001 | What is a "substantial feature" requiring a full blueprint? | New protected source file OR >15 lines OR touches auth/money/data. |
| AMB-002 | What is a "significant decision" requiring `DECISION-XXXX.md`? | New source file, auth/money/data change, or unresolved ambiguity. |
| AMB-003 | What counts as "real-user reality testing"? | HTTP Layer A + browser Layer B for a realistic end-to-end journey. |
| AMB-007 | Which green-light gate is canonical? | Both `builder:preflight` and `lifeos:bp-priority:verify` must pass. |
| AMB-008 | How many commits may deploy lag behind `origin/main`? | Zero for product-facing changes; N=3 for docs-only. |
| AMB-009 | Can `never-stop` change a step from `blocked` to `done`? | No. Only SENTRY/Chair/founder after evidence. |
| AMB-010 | SMOS revenue credentials? | Phase 5 blocked until `EMAIL_FROM`, `RESEND_API_KEY`/SMTP, `STRIPE_*` set. |

---

## Next immediate action

**Wrap `commitManyToGitHub` / `commitToGitHub` with the file-placement + blueprint-authority gate.**  
This is the only task that closes the gap where `services/apiSpecification.js` shipped without `@ssot` after the gate was already live.
