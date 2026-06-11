# Handoff

## ⚠️ Deliberation v2.7 (2026-06-10) — WIRED, NOT SHIPPED

**Mission:** `FACTORY-DELIBERATION-V27-0001` — status **`wired_uncommitted`**.

| Check | State |
|-------|--------|
| Local mechanical SENTRY (14 aspects) | PASS (WIRED) |
| Qualitative SENTRY verdict | **FAIL until commit + deploy** |
| Git | **Uncommitted** — deliberation routes/services/migrations/mission pack |
| Neon 9 tables | **UNVERIFIED** — migrations apply on server boot via `startup/database.js` after deploy |
| Railway API | **UNVERIFIED** — needs `PUBLIC_BASE_URL` + keys smoke |

**Next:** (1) commit deliberation slice, (2) deploy Railway, (3) `DELIBERATION_SENTRY_PROVEN=1 npm run factory:deliberation-v27:sentry-loop`, (4) fix any P0 from Claude/Cursor SENTRY audits.

Docs: `docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md`, `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SESSION_SENTRY_LOOP_REPORT.md`

---

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
| Role-based council routing | **Queued** — mission 0031; routing audit + provider lock done |
| First product mission (Commitments + C2) | **PSSOT complete** — `PSSOT.md`; BPB → BLUEPRINT from PSSOT |
| Provider key sprint | **Blocked** until 0031 receipts |

## Next priorities (operator)

1. **`prompts/00-PROVIDER-STRATEGY-LOCK.md`** — Decision A locked (tiers + departments)
2. **`docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`** — today's routing truth
3. **`FACTORY-REBOOT-0031`** — implement department-first routing (spec in mission folder)
4. **`PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`** — PSSOT complete; BPB → **BLUEPRINT from PSSOT** (7-day MVP only)
5. **Do not** gather new API keys until step 3 receipts PASS

**Parallel track (founder):** Refine product founder packet / UX boundaries while 0031 runs. Product proves LifeOS value; factory proves routing.

**Product proof question:** Can LifeOS turn real conversations into useful action? (Not therapy, not surveillance, not all of LifeOS.)

## Key docs

- `prompts/00-PROVIDER-STRATEGY-LOCK.md` — **locked provider strategy (Decision A)**
- `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` — **routing problem receipt**
- `builderos-reboot/MISSIONS/FACTORY-REBOOT-0031/` — role-based routing mission
- `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT.md` — **first product mission PSSOT**
- `builderos-reboot/PSSOT_VOCABULARY.md` — PSSOT vs amendment vs blueprint
- `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` — **repo truth layers** (factory vs legacy spine)
- `prompts/00-HIST-LEGACY-BOUNDARY.md` — **mandatory STOP read** (legacy = Hist; not a README)
- `docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md` — **Hist-owned legacy repos/trees** (Adam 2026-05-24); full map
- Path `AGENTS.md` at `builderos-reboot/`, `factory-staging/`, `routes/`, `services/`, blueprint pack
- `.cursor/rules/system-authority-layers.mdc` — always-on Cursor boundary rules
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
