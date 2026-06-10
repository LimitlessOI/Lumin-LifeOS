# Handoff

## For Adam (one command)

```bash
npm run factory:ci
```

**16/16 checks pass** after truth-layer audit fixes (2026-05-24).

**2026-06-10 security hotfix in progress:** `factory-staging/factory-core/builder/run-step.js`
and canonical mission source `builderos-reboot/MISSIONS/FACTORY-REBOOT-0029/CONTENT/run-step.js`
now canonicalize execute-step source/target paths with `path.resolve` + containment checks
before writes. Trigger found by cron audit: a target like
`factory-staging/test-fixtures/sandbox/../../../path-traversal-proof.txt` passed the old
string-prefix sandbox check and wrote outside the declared sandbox.
`builderos-reboot/scripts/factory-execute-step-integration.mjs` now asserts the valid write
still succeeds, traversal is blocked, and byte-exact SHA mismatch does not write a target.
`FACTORY-REBOOT-0029` hash pin `S2904` was refreshed for the canonical content update, and
the `run-step.js` acceptance pins in missions 0005, 0013, and 0029 were updated to the new
secure runtime SHA.
Next proof to run: `npm run factory:ci`.

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
| First product mission (Commitments + C2) | **Queued** — founder packet ready |
| Provider key sprint | **Blocked** until 0031 receipts |

## Next priorities (operator)

1. **`prompts/00-PROVIDER-STRATEGY-LOCK.md`** — Decision A locked (tiers + departments)
2. **`docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`** — today's routing truth
3. **`FACTORY-REBOOT-0031`** — implement department-first routing (spec in mission folder)
4. **`PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`** — BPB product mission (separate lane)
5. **Do not** gather new API keys until step 3 receipts PASS

**Parallel track (founder):** Refine `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` founder packet while 0031 runs — product proves LifeOS value; factory proves routing. 0031 accelerates 0035 when council drafts/reviews need department pools; v1 detection/MIT path can start without it.

## Key docs

- `prompts/00-PROVIDER-STRATEGY-LOCK.md` — **locked provider strategy (Decision A)**
- `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` — **routing problem receipt**
- `builderos-reboot/MISSIONS/FACTORY-REBOOT-0031/` — role-based routing mission
- `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/` — first product mission
- `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` — **repo truth layers** (factory vs legacy spine)
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
