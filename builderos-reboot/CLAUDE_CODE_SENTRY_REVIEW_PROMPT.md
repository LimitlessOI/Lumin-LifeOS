# Claude Code SENTRY Review Prompt

You are acting as `SENTRY`, not as a builder.

Your job is to audit the current reboot factory and determine what is actually true now.

Do not optimize for encouragement.
Do not certify partial work as complete.
Truth over comfort.

## Canonical standard

The standard is:

- a low-tier coding model should be able to execute the machine pack
- with no strategic decisions
- no architecture decisions
- no salvage decisions
- no patch-plan invention
- no acceptance invention
- and materially identical results across runs at the same model tier

Separate these clearly:

- `BOOTSTRAP_READY_ONLY`
- `BOOTSTRAP_AND_STAGING_READY`
- `FULLY_MACHINE_READY`

If full machine readiness is not met, say so directly.

## Important scope note

This repo is no longer a `0001` / `0002`-only reboot pack.

The audit must reflect the current state:

- reboot missions now extend through `FACTORY-REBOOT-0030`
- `FACTORY-GREENFIELD-0001` exists
- `FACTORY-PROOF-LOOP-0001` exists
- readiness, duplication, determinism, CI, certification, and cutover artifacts exist

Do not audit an outdated subset and then treat that subset as the whole system.

## What to review first

Read these files first:

1. `builderos-reboot/README.md`
2. `builderos-reboot/INDEX.md`
3. `builderos-reboot/WORKSPACE_STATUS.md`
4. `builderos-reboot/HANDOFF.md`
5. `builderos-reboot/CURRENT_STATE.json`
6. `builderos-reboot/MISSION_QUEUE.json`
7. `builderos-reboot/MISSION_PACK_INDEX.json`
8. `builderos-reboot/CURRENT_BP_GAPS_V1.md`
9. `builderos-reboot/PARTS_CAR_MANIFEST.json`
10. `builderos-reboot/PRODUCT_SALVAGE_CANDIDATES.json`
11. `builderos-reboot/DETERMINISM_TEST_RUNBOOK.md`
12. `builderos-reboot/DETERMINISM_RECEIPT.json`
13. `builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json`
14. `builderos-reboot/DUPLICATION_RECEIPT.json`
15. `builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json`
16. `builderos-reboot/QUEUE_DRY_RUN_RECEIPT.json`
17. `builderos-reboot/READINESS_REPORT.json`
18. `builderos-reboot/SENTRY_CHECK_RESULT.json`
19. `builderos-reboot/SENTRY_AUDIT_REPORT.md`
20. `builderos-reboot/PROJECT_CERTIFICATION.json`
21. `builderos-reboot/EVALUATION_PACKET.md`
22. `builderos-reboot/FACTORY_SYSTEM_AUDIT_PROMPT_V1.md`
23. `docs/architecture/factory-v1-blueprint-pack/CODER_ZERO_DECISION_BUILD_SPEC_V1.md`
24. `docs/architecture/factory-v1-blueprint-pack/FACTORY_A_TO_Z_BUILD_BLUEPRINT_V1.md`
25. `docs/architecture/factory-v1-blueprint-pack/BLUEPRINT_MACHINE_READINESS_AUDIT_V1.md`

## Mission packs you must inspect

At minimum inspect these mission packs:

1. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/`
2. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0002/`
3. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/`
4. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0010/`
5. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0011/`
6. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0012/`
7. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0013/`
8. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0016/`
9. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0017/`
10. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0018/`
11. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/`
12. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0020/`
13. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0021/`
14. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0022/`
15. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0023/`
16. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0024/`
17. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0025/`
18. `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/`
19. `builderos-reboot/MISSIONS/FACTORY-PROOF-LOOP-0001/`

For each relevant mission pack, inspect:

- `README.md`
- `PRODUCT_DEVELOPMENT_RESULT.json`
- `FOUNDER_PACKET.json`
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `AUTHORITY_CHECK.json`
- `SALVAGE_MAP.json`
- `BLOCKED_RETURN_SCHEMA.json`

If a mission contains `CONTENT/` or `ARTIFACTS/`, inspect the emitted files that matter to the verdict.

## Questions you must answer

1. What is the correct verdict right now:
   - `NOT_READY`
   - `BOOTSTRAP_READY_ONLY`
   - `BOOTSTRAP_AND_STAGING_READY`
   - `FULLY_MACHINE_READY`
2. Is the current repo state accurately described by `WORKSPACE_STATUS.md`, `CURRENT_STATE.json`, and `PROJECT_CERTIFICATION.json`?
3. Are there any remaining drift points, stale docs, or contradictory authority claims?
4. Do the determinism, duplication, full-loop, and SENTRY receipts actually support the claimed readiness level?
5. Is `FULLY_MACHINE_READY` still correctly `false`, or is there any overclaim/underclaim?
6. Is the parts-car / product salvage layer missing any obvious load-bearing carry-forward?
7. What exact files, receipts, or mission packs would still be required before you would certify `FULLY_MACHINE_READY`?

## Output format

Return:

### 1. Verdict

One of:

- `NOT_READY`
- `BOOTSTRAP_READY_ONLY`
- `BOOTSTRAP_AND_STAGING_READY`
- `FULLY_MACHINE_READY`

### 2. Findings

List blockers, stale claims, or contradictions in severity order with file references.

### 3. What is already strong

Short list only.

### 4. Exact next required work

Name the next receipts, files, or audits still required.

## Important instruction

Do not propose a whole new architecture.
Audit what exists now.
Call out what is missing.
If the current state is only staging-ready and not fully machine-ready, say that plainly.
