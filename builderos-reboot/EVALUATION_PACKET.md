# Evaluation Packet — Factory Reboot

**For:** External audit (Codex / Claude Code)  
**Updated:** 2026-05-24 (missions through FACTORY-REBOOT-0030)  
**Operator one-liner:** `npm run factory:ci` (expect **16/16 PASS**)

## What was built

- **33 completed missions** per `MISSION_QUEUE.json` (REBOOT-0001 → 0030 + GREENFIELD + PROOF-LOOP + product salvage stub)
- **factory-staging/** live runtime with full hot path (intake → SENTRY → TSOS → Historian)
- **Blueprint pack** rebuild manifest + audit addenda

## Commands to run (in order)

```bash
npm run factory:ci
npm run factory:sentry
cat builderos-reboot/PROJECT_CERTIFICATION.json
```

## Honest boundaries (do not overclaim)

| Claim | Status |
|-------|--------|
| BOOTSTRAP_AND_STAGING_READY | Verify via `factory:ci` |
| MECHANICAL_DETERMINISM_PROXY | Yes — 3-run executor proxy |
| SAME_TIER_CODER_DETERMINISM | **NO** — label removed from cert |
| FULLY_MACHINE_READY | **NO** |
| Income / LifeOS product | **NO** — platform only |

## Files reviewers should read

1. `builderos-reboot/HANDOFF.md`
2. `builderos-reboot/CURRENT_STATE.json`
3. `builderos-reboot/MISSION_QUEUE.json`
4. `builderos-reboot/FACTORY_SYSTEM_AUDIT_PROMPT_V1.md`
5. `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md`

## Grade rubric suggestion

- **9–10:** CI pass, truth docs match queue, no certification overclaims
- **6–8:** CI pass with documented gaps
- **<6:** Stale WORKSPACE_STATUS/CURRENT_STATE vs queue, or false SAME_TIER / full-loop pass with unresolved C2
