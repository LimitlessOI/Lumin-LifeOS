# Workspace Status

**Date:** 2026-06-10
**Source of truth:** `builderos-reboot/MISSION_QUEUE.json` (33 missions complete)

## Phase

**Factory reboot complete: FACTORY-REBOOT-0001 → 0030** plus `FACTORY-GREENFIELD-0001`, `FACTORY-PROOF-LOOP-0001`, `PRODUCT-MARKETINGOS-SALVAGE-0001`.

**Verdict:** `BOOTSTRAP_AND_STAGING_READY` — `npm run factory:ci` **16/16 PASS** before
the 2026-06-10 execute-step sandbox hotfix; rerun `npm run factory:ci` after the hotfix
commit.

## Adam's status check

```bash
npm run factory:ci           # full regression (authoritative)
npm run factory:readiness    # quick summary
cat builderos-reboot/PROJECT_CERTIFICATION.json
```

## Final arc (0026–0030)

| # | Mission | What it adds |
|---|---------|--------------|
| 26 | 0026 | Phase 11 full governed loop proof script |
| 27 | 0027 | Phase 12 product salvage candidates (46) |
| 28 | 0028 | Certification v2 (Phase 11–12) |
| 29 | 0029 | TSOS guardrails on execute-step hot path |
| 30 | 0030 | Upstream gates, SENTRY depth, Historian, C2/truth surfaces |

Also complete: `FACTORY-PROOF-LOOP-0001`, `FACTORY-GREENFIELD-0001`, `PRODUCT-MARKETINGOS-SALVAGE-0001` (stub).

## Key artifacts

- `factory-staging/` — live runtime (execute-step hot path)
- `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md` — rebuild-from-scratch map
- `builderos-reboot/PROJECT_CERTIFICATION.json` — honest claim boundaries
- `builderos-reboot/MISSION_PACK_INDEX.json` — regenerate via `node builderos-reboot/scripts/generate-mission-pack-index.mjs`
- `builderos-reboot/FACTORY_SYSTEM_AUDIT_PROMPT_V1.md` — external audit prompt

## Honest boundaries

| Claim | Status |
|-------|--------|
| `BOOTSTRAP_AND_STAGING_READY` | Yes when `factory:ci` green |
| `MECHANICAL_DETERMINISM_PROXY` | Yes — 3-run executor proxy only |
| `SAME_TIER_CODER_DETERMINISM` | **No** — not human cold-coder proof |
| `FULLY_MACHINE_READY` | **No** — reserved for system-generated BPs |
| Income / LifeOS product | **No** — factory platform only; Phase 12 salvage is stub |

## 2026-06-10 sandbox hotfix receipt

- **Bug found:** `factory-staging/factory-core/builder/run-step.js` used a string-prefix
  sandbox check before `path.join` normalized `../` segments, so an execute-step target could
  look inside `factory-staging/test-fixtures/sandbox/**` while resolving to `/workspace/*.txt`.
- **Impact:** a malformed or hostile step could write outside its declared sandbox; the cron
  audit reproduced this with a disposable proof file and removed it immediately.
- **Fix state:** runtime plus canonical mission source `FACTORY-REBOOT-0029/CONTENT/run-step.js`
  now resolve repo-relative paths with `path.resolve`, reject paths outside the repo, check
  target containment with `path.relative`, reject source paths that escape the repo, and verify
  byte-exact SHA before writing.
- **Regression:** `builderos-reboot/scripts/factory-execute-step-integration.mjs` includes
  traversal and SHA-mismatch no-write assertions. `FACTORY-REBOOT-0029` hash pin `S2904`
  was refreshed, and shared `run-step.js` acceptance pins in missions 0005, 0013, and 0029
  now expect the secure runtime SHA. Next proof: `npm run factory:ci`.

## Optional (not blockers)

- Push `lumin-factory/` to standalone GitHub repo
- First income-linked product mission via BPB
