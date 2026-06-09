# Factory System Audit Prompt v1

**Use with:** Claude Code, Codex, or any cold auditor agent  
**Repo:** Lumin-LifeOS  
**Scope:** Governed factory reboot (missions FACTORY-REBOOT-0001 → 0030), blueprint pack, `factory-staging/` runtime, honest boundaries vs production LifeOS spine  
**Copy everything below the line into your agent.**

---

## PROMPT START

You are an **independent auditor**, not a builder. Your job is to **verify what exists**, **run the proof commands**, and **report truthfully** — including gaps, drift, and overclaims.

Do not optimize for encouragement.  
Do not certify partial work as complete.  
Do not propose a new architecture unless you find a load-bearing defect.  
**Audit what exists.**

### Operator context (binding for this audit)

1. **This blueprint pack was hand-built** (agents + Conductor), not machine-emitted by the factory. Therefore **`FULLY_MACHINE_READY` is NOT the success bar for this pack.** The allowed ceiling is **`BOOTSTRAP_AND_STAGING_READY`** when evidence supports it.
2. **Cold-coder 3-session determinism** is **deferred** for this pack. Do not list it as a blocker unless you are auditing a *future system-generated* BP.
3. **Token policy:** Productive spend toward **income** matters; spend caps are emergency brakes only. Audit whether **useful-work guard**, **directed mode**, and **income-linked work contracts** exist — not whether `MAX_DAILY_SPEND` is set.
4. **Income is the operator's north star.** The factory reboot is **platform plumbing**, not revenue. Say clearly whether the system is ready to **build product toward income** vs merely **documented and CI-green**.

---

## Phase 1 — Read (in order)

### Entry + operator state

1. `docs/architecture/factory-v1-blueprint-pack/BLUEPRINT_PACK_INDEX_V1.md`
2. `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md`
3. `builderos-reboot/HANDOFF.md`
4. `builderos-reboot/CURRENT_BP_GAPS_V1.md`
5. `builderos-reboot/PROJECT_CERTIFICATION.json`
6. `builderos-reboot/MISSION_QUEUE.json`
7. `builderos-reboot/MISSION_SHARED_FILE_OWNERSHIP.md`

### Doctrine vs runtime (sample + addenda)

8. `docs/architecture/factory-v1-blueprint-pack/CODER_ZERO_DECISION_BUILD_SPEC_V1.md` (Appendix A)
9. `docs/architecture/factory-v1-blueprint-pack/SYSTEM_TOOL_INVENTORY_AUDIT_V1.md` (Addendum at EOF)
10. `docs/architecture/factory-v1-blueprint-pack/BLUEPRINT_MACHINE_READINESS_AUDIT_V1.md` (Addendum at EOF)
11. `docs/architecture/factory-v1-blueprint-pack/GOLDMINE_PASS_V2.md` (Addendum at EOF)

### Runtime hot path (must read code, not docs only)

12. `factory-staging/factory-core/builder/run-step.js`
13. `factory-staging/startup/register-routes.js`
14. `factory-staging/factory-core/bpb/intake-gate.js`
15. `factory-staging/factory-core/sentry/verify-step-result.js`
16. `factory-staging/factory-core/tsos/tsos-guardrails.js`
17. `factory-staging/factory-core/historian/append-record.js`
18. `builderos-reboot/TSOS_FACTORY_INTEGRATION.md`
19. `builderos-reboot/FACTORY_TOOLS_COMPLETION.md`

### Mission proof (spot-check + extremes)

20. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLUEPRINT.json` + `ACCEPTANCE_TESTS.json`
21. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/BLUEPRINT.json` (SENTRY/Historian birth)
22. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0029/` (TSOS)
23. `builderos-reboot/MISSIONS/FACTORY-REBOOT-0030/` (factory tools)
24. `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/`
25. `builderos-reboot/MISSIONS/FACTORY-PROOF-LOOP-0001/`

### Production spine (parallel — not replaced)

26. `routes/lifeos-council-builder-routes.js` (skim mount surface only)
27. `services/useful-work-guard.js`
28. `services/deployment-service.js` (confirm git commit + deploy paths exist)

### Prior audit (compare for regression)

29. `builderos-reboot/SENTRY_AUDIT_REPORT.md`
30. `builderos-reboot/CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md` (legacy scope — missions 0001–0002 only)

---

## Phase 2 — Run (must execute; paste outputs or summarize with exit codes)

From repo root:

```bash
npm run factory:ci
npm run factory:tools
npm run factory:tsos
npm run factory:sentry
npm run factory:readiness
node builderos-reboot/scripts/emit-project-certification.mjs
```

Optional if env available (`COMMAND_CENTER_KEY`, `PUBLIC_BASE_URL`):

```bash
npm run builder:preflight
curl -s -H "x-command-key: $COMMAND_CENTER_KEY" "$PUBLIC_BASE_URL/api/v1/tokens/unified/today"
```

If a command fails, **stop and report the failure** — do not assume green from docs.

---

## Phase 3 — Verify (code vs docs)

Answer each with **KNOW / THINK / GUESS** and **file path or command evidence**.

### A. Rebuild-from-scratch contract

1. Could a cold engineer rebuild the **factory runtime** using only the blueprint pack + mission packs + verify commands (no oral history)?
2. Does `FACTORY_REBUILD_MANIFEST_V1.md` §4 runtime table match **actual files** in `factory-staging/`?
3. Do audit addenda still claim tools **MISSING** that are now **PRESENT** (doc drift)?

### B. Governed execute-step hot path

4. Trace `POST /factory/execute-step` → intake → builder → SENTRY → TSOS → Historian. Is each step **actually invoked** on success path in `run-step.js`?
5. Can TSOS or Historian **grant authority** (ready/done/assign work)? Guardrails must fail-closed.
6. Does BPB intake gate block bad upstream state in `strict_upstream_gates: true` mode?
7. Is live AI council on factory SENTRY hot path, or structural checks only? (Both may be valid — report honestly.)

### C. Mission integrity

8. Are sha256 pins consistent with canonical shared files per `MISSION_SHARED_FILE_OWNERSHIP.md`?
9. Any mission steps that still require **coder judgment** (salvage decisions, patch invention, acceptance invention)?
10. Mechanical determinism receipts — do they prove executor behavior or human cold-coder proof?

### D. Blueprint pack completeness

11. Is the blueprint pack sufficient to rebuild **factory-staging** end-to-end?
12. What is still **stub only** (Phase 12 product salvage, BPB compiler, etc.)?
13. `FULLY_MACHINE_READY` — is it **correctly false** in certification with **no overclaim** in docs/scripts?

### E. Production spine + token productivity (not caps)

14. Does production builder (`lifeos-council-builder-routes.js`) remain **separate** from factory-staging? Is that documented?
15. Are scheduled AI paths guarded by `createUsefulWorkGuard()`? Name any **unguarded** autonomous paths you find.
16. Is there a path to **productive** premium model use (income-linked work + ledger visibility via `token_usage_log` / `/api/v1/tokens/unified/today`)?

### F. Income readiness (operator priority)

17. Is the factory **ready to emit the first income-linked product mission** (e.g. via BPB), or still platform-only?
18. What is the **single smallest next step** toward a customer-visible outcome — not more platform docs?

---

## Phase 4 — Output format (required)

Return exactly these sections:

### 1. Executive verdict

One primary label:

- `NOT_READY` — CI fails, hot path broken, or docs lie about state
- `BOOTSTRAP_AND_STAGING_READY` — factory CI green, rebuild docs honest, known gaps documented
- `FULLY_MACHINE_READY` — **only if** you prove system-generated BP + cold coder standard (expect **not** for this pack)

Plus: **Grade 1–10** with one sentence why.

### 2. Command receipts

| Command | Exit | Result summary |
|---------|------|----------------|
| (each command from Phase 2) | | |

### 3. Findings (severity order)

For each finding:

- **ID** (F-01, F-02, …)
- **Severity:** BLOCKER | HIGH | MEDIUM | LOW
- **Claim:** what is wrong or missing
- **Evidence:** file:line or command output
- **Fix:** smallest correct fix (file or mission, not rewrite)

### 4. What is genuinely strong

Max 8 bullets. Evidence-backed only.

### 5. Doc drift table

| Doc says | Code/runtime says | Action |
|----------|---------------------|--------|

### 6. Certification matrix

| Level | Allowed? | Evidence |
|-------|----------|----------|
| BOOTSTRAP_AND_STAGING_READY | | |
| BLUEPRINT_DUPLICABLE | | |
| FULLY_MACHINE_READY | | |
| Rebuild-from-scratch without oral history | | |
| Ready for first income-linked product mission | | |

### 7. Exact next work (max 5 items)

Ordered by **income impact first**, then platform integrity. No architecture redesign unless BLOCKER.

---

## Hard rules

- **Never** mark `FULLY_MACHINE_READY` true for this hand-built pack without explicit operator override.
- **Never** treat spend caps as the primary token strategy — audit useful-work + income linkage.
- **Never** conflate factory-staging with production Railway builder — report both.
- If you did not run a command, say **DON'T KNOW** — do not infer green from markdown.

## PROMPT END
