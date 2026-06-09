# Handoff

## For Adam (one command)

```bash
npm run factory:ci
```

**16/16 checks pass** after truth-layer audit fixes (2026-05-24).

## SENTRY verdict

**`BOOTSTRAP_AND_STAGING_READY`** — not `FULLY_MACHINE_READY`.

Full audit: `builderos-reboot/SENTRY_AUDIT_REPORT.md`

## A-to-Z status (honest)

| Scope | Done? |
|-------|-------|
| Factory reboot missions 0001–0030 | **Yes** |
| Upstream gates (PD / Founder Packet / BPB intake) | **Yes** — legacy + strict modes |
| SENTRY depth on hot path | **Yes** — anti-pattern, lookback, proof freshness |
| Historian on hot path | **Yes** |
| TSOS on execute-step hot path (guardrailed) | **Yes** — see `TSOS_FACTORY_INTEGRATION.md` |
| Build spec segments 0–10 (runtime payloads) | **Yes** |
| Build spec Phase 11 (full governed loop) | **Yes** — real SENTRY contract verify wired |
| Build spec Phase 12 (product salvage) | **Stub** — 46 candidates + shell pack |
| Blueprint duplicability | **Yes** |
| `lumin-factory/` git-ready locally | **Yes** |
| **`FULLY_MACHINE_READY`** | **Not for this pack** — deferred until system generates a BP; use `BOOTSTRAP_AND_STAGING_READY` here |
| Push to GitHub | **Optional** — `lumin-factory/` standalone repo only |
| Full LifeOS product | **No** |

## Key docs

- `FACTORY_TOOLS_COMPLETION.md` — mission 0030 tool matrix
- `TSOS_FACTORY_INTEGRATION.md` — TSOS lane + guardrails
- `SENTRY_AUDIT_REPORT.md` — findings + fixes
- `CURRENT_BP_GAPS_V1.md` — remaining gaps
- `MISSION_SHARED_FILE_OWNERSHIP.md` — shared file rules
- `EVALUATION_PACKET.md` — tomorrow's review
- `FACTORY_SYSTEM_AUDIT_PROMPT_V1.md` — **paste into Codex / Claude Code for full system audit**
- `FACTORY_AUDIT_PROMPT_SIMPLE.md` — **short CC audit (8 files, 2 commands)**

## Commands

```bash
npm run factory:full-loop
npm run factory:sentry
npm run factory:tsos
npm run factory:tools
npm run factory:certify
```
