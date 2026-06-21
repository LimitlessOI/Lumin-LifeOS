<!-- SYNOPSIS: CUR overnight mandate — ChC / Conductor -->

# CUR overnight mandate — ChC / Conductor

**Adam handoff — paste this entire file into CUR before bed.**

---

You are CUR acting as ChC / Conductor for BuilderOS execution.

Do not stop at a local proof. Do not report subsystem wins as objective completion. The only score is whether the assigned Blueprint/Objective completes autonomously in the real running path.

## Current priority order

1. Finish **AUTONOMOUS-RECOVERY-0002**.
2. Commit and push the recovery-owner/autopilot wiring.
3. Fix Railway deploy drift until Railway is actually running the latest commit.
4. Prove the **real** observe/autopilot path: `hard_stop` or `mission_failed` must trigger recovery automatically without Adam, CUR, or a manual node/npm command.
5. Produce final receipt:
   - **OBJECTIVE_COMPLETE**, or
   - **UNSOLVED_RECEIPT.json** + **FOUNDER_ALERT.json**

Do not move to Phase 2 cutover until production autonomous recovery is proven.

Do not start broad LifeOS product work yet.

---

## After AUTONOMOUS-RECOVERY-0002 is proven in production

Start the next small product Objective only:

### Conversation Commitments v1

**Scope:**

- manual text entry only
- extract commitment: who, what, to whom, due date if present, source text, confidence
- store commitment
- list commitments
- mark done / deferred / broken
- reminder/status support
- Hist receipt
- CFO/token receipt
- SNT checks malformed input, duplicate commitments, missing dates, privacy-sensitive text, false claims
- no audio capture
- no therapy/coaching interpretation
- no broad LifeOS expansion

---

## Loop rules (overnight)

Run continuously overnight, but not blindly.

- If blocked, recover automatically.
- If repeated same failure signature, escalate to ChC/Cncl/BPB with failure packet.
- If recovery exhausts, produce **UNSOLVED_RECEIPT.json** + **FOUNDER_ALERT.json**.
- Never silently stop.
- Never fake PASS.
- Verified FAIL is useful feedback, but the Objective score is still **FAIL** until delivered.

---

## When Adam returns — scoreboard only

Reply with exactly this format:

1. Current Objective name
2. **COMPLETE** or **NOT COMPLETE**
3. Production commit SHA
4. Railway running SHA
5. Receipts produced
6. Remaining blocker if not complete
7. Next autonomous action the system took

---

## Handoff baseline (2026-06-11 ~bedtime)

| # | Field | Value |
|---|--------|--------|
| 1 | Current Objective | **AUTONOMOUS-RECOVERY-0002** |
| 2 | Status | **NOT COMPLETE** — deploy/cron green; **production end-to-end failure→recovery without manual invoke not yet proven** |
| 3 | Git `main` SHA | `ac57d1471d3cd6af180bf604320e01d6c09a9eac` |
| 4 | Railway running SHA | `ac57d1471d3cd6af180bf604320e01d6c09a9eac` (parity ✅) |
| 5 | Receipts so far | `builderos-reboot/OVERNIGHT_BP_AUTONOMY_RECEIPT.json`, `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/AUTOPILOT_RECOVERY_PROOF.json` (local), `OBJECTIVE_VERDICT.json` (do not treat as final until prod path proven) |
| 6 | Remaining blocker | Step 4: simulate `mission_failed` **on production filesystem/cron path**; recovery must complete with **no** `npm run factory:autopilot` from IDE/shell |
| 7 | Next autonomous action | Production cron (`FACTORY_AUTOPILOT_CRON_MS=300000`, `GET /internal/cron/factory-recovery`) + recovery owner in `builderos-reboot/scripts/mission-recovery-owner.mjs` |

### Already done (do not re-do unless drift)

- [x] Recovery owner wired (`mission-recovery-owner.mjs`, `autopilot-runner.mjs`, `factory-autopilot-scheduler.js`)
- [x] Committed + pushed to `main`
- [x] Railway deploy parity (migration GAP-FILL chain cleared boot)
- [x] `/internal/cron/factory-recovery` → 200
- [x] Local `npm run factory:autopilot:proof` → PASS

### Proof commands (reference only — **manual npm does not satisfy step 4**)

- Verify SHA: `GET /api/v1/lifeos/builder/ready` → `codegen.deploy_commit_sha`
- Verify cron: `GET /internal/cron/factory-recovery`
- Production proof must use **scheduled/cron/in-app trigger** on Railway, not founder shell

### Conversation Commitments v1

**Do not start** until AUTONOMOUS-RECOVERY-0002 final receipt = **OBJECTIVE_COMPLETE** on production path above.
