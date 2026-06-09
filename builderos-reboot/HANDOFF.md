# Handoff

## For Adam (one command)

```bash
npm run factory:ci
```

**14/14 checks pass** after mission FACTORY-REBOOT-0029 (TSOS + guardrails, 2026-05-24).

## SENTRY verdict

**`BOOTSTRAP_AND_STAGING_READY`** — not `FULLY_MACHINE_READY`.

Full audit: `builderos-reboot/SENTRY_AUDIT_REPORT.md`

## A-to-Z status (honest)

| Scope | Done? |
|-------|-------|
| Factory reboot missions 0001–0029 | **Yes** |
| TSOS on execute-step hot path (guardrailed) | **Yes** — see `TSOS_FACTORY_INTEGRATION.md` |
| Build spec segments 0–10 (runtime payloads) | **Yes** |
| Build spec Phase 11 (full governed loop) | **Yes** — real SENTRY contract verify wired |
| Build spec Phase 12 (product salvage) | **Stub** — 46 candidates + shell pack |
| Blueprint duplicability | **Yes** |
| `lumin-factory/` git-ready locally | **Yes** |
| **`FULLY_MACHINE_READY`** | **No** — needs 3-session same-tier coder test |
| Push to GitHub | **You** |
| Full LifeOS product | **No** |

## Key docs

- `TSOS_FACTORY_INTEGRATION.md` — TSOS lane + guardrails
- `SENTRY_AUDIT_REPORT.md` — findings + fixes
- `CURRENT_BP_GAPS_V1.md` — remaining gaps
- `MISSION_SHARED_FILE_OWNERSHIP.md` — shared file rules
- `EVALUATION_PACKET.md` — tomorrow's review

## Commands

```bash
npm run factory:full-loop
npm run factory:sentry
npm run factory:tsos
npm run factory:certify
```
