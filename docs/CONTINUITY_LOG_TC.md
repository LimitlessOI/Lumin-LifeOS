# Continuity Log — TC Lane

> Log sessions that primarily change TC routes/services, TC migrations, or Amendment 17 scope.

**Most recent first.**

---

## [FIX] Update 2026-05-10 #3 — TC syntax repair after builder truncation

### Files changed
- `services/tc-document-validator.js` — restored the last known-good fail-closed document validator from `dacd2808`; current file had been truncated by system-build commit `c8c55333` to six lines ending inside the `DATE_RE` regular expression. This service is dynamically imported by TC intake/upload/inspection routes, so affected endpoints would throw instead of validating documents.
- `services/tc-webhook-validator.js` — deleted the resurrected orphan broken file. It had been removed in the 2026-05-09 cleanup as truncated and never imported, but system-build commits reintroduced a 12-line partial import file that failed syntax checks.
- `docs/projects/AMENDMENT_17_TC_SERVICE.md` — `Last Updated` and Change Receipts now document both the restored validator and deleted orphan, with verification status and residual route-verifier failures.

### State after this session
- `node --check services/tc-document-validator.js` PASS; import smoke with `services/tc-doc-intake.js` PASS; top-level runtime syntax sweep PASS with deleted files skipped.
- `node scripts/verify-project.mjs --project tc_service` still FAILS 4 route-contract checks (400/500 from missing test payload/mailbox), but syntax checks are green.

### Next agent (TC lane): start here
1. Keep `services/tc-webhook-validator.js` deleted unless a real mounted validator is built and added to Amendment 17 owned files/manifest.
2. Treat TC verifier route-contract failures separately from this syntax repair; inspect verifier payload expectations before changing runtime routes.
3. Durable platform follow-up: prevent builder from overwriting existing TC service files with partial fragments.

---

## [BUILD] Update 2026-04-20 #2 — Lane handoff hardening (no runtime code)

### Files changed
- `docs/CONTINUITY_LOG_TC.md` — structured handoff (this entry).
- `docs/projects/AMENDMENT_17_TC_SERVICE.md` — **Agent Handoff Notes (TC lane)**, single **Last Updated** row, **Owned Files** synced to manifest, new **Change Receipts** row.
- `docs/projects/AMENDMENT_17_TC_SERVICE.manifest.json` — `last_verified_at` refreshed after `verify-project.mjs --project tc_service`.
- `docs/QUICK_LAUNCH.md` — **Latest Completed** bullet for TC lane continuity.
- `docs/CONTINUITY_LOG.md` — pointer update for cross-lane readers.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — receipt for Quick Launch edits (zero-drift protocol surface).

### State after this session
- TC verify script still **PASS** locally (`node scripts/verify-project.mjs --project tc_service`; HTTP route checks skip without `PUBLIC_BASE_URL`).
- Next substantive TC work remains **first-file / secrets / intake** per Amendment 17 Build Plan and manifest `next_task` — unchanged by this doc slice.

### Next agent (TC lane): start here
1. Read `docs/projects/AMENDMENT_17_TC_SERVICE.md` → **## Agent Handoff Notes (TC lane)** → latest **## Change Receipts** rows.
2. If touching council/model routing: `docs/CONTINUITY_LOG_COUNCIL.md` + `AMENDMENT_01_AI_COUNCIL.md`.
3. **Parallel with LifeOS:** do not edit the same tracked files another conductor owns; if overlap, HALT/rebase per `docs/SSOT_NORTH_STAR.md` Article II §2.6 ¶9 and `docs/QUICK_LAUNCH.md`.
4. After each shipped slice: this file + Amendment 17 receipts (+ manifest `next_task` / `current_focus` when priority shifts).

---

## [BUILD] Update 2026-04-19 #1 — Lane initialized

This lane log is now the canonical handoff path for TC work when running a dedicated TC conductor (solo or parallel with LifeOS conductor).

### Next agent (TC lane): start here
1. Read `docs/projects/AMENDMENT_17_TC_SERVICE.md` (latest `Change Receipts` rows first).
2. Read `docs/CONTINUITY_LOG_COUNCIL.md` if task touches model routing/council paths.
3. Execute TC backlog from Amendment 17, update receipts + this log after each shipped slice.
