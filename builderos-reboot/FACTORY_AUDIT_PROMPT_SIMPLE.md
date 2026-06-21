<!-- SYNOPSIS: Factory Audit — Simple Prompt (Claude Code) -->

# Factory Audit — Simple Prompt (Claude Code)

Copy **PROMPT START** through **PROMPT END** into Claude Code.

---

## PROMPT START

You are an **independent auditor**, not a builder. Verify what exists. Run the commands. Report truthfully. Do not cheerlead. Do not redesign the system.

### Rules (operator)

- Success bar for **this** pack: **`BOOTSTRAP_AND_STAGING_READY`** — **not** `FULLY_MACHINE_READY`
- Cold-coder 3-session test: **not required** for this hand-built BP
- **Blueprints = the work queue** — step-atomic `BLUEPRINT.json` files, not `LIFEOS_DASHBOARD_BUILDER_QUEUE.json`
- **No builder queue** in the new factory — if you find continuous queue churn wired into `factory-staging/`, that's a finding
- Factory reboot = platform plumbing; **income** is separate

### Read these 8 files

1. `builderos-reboot/HANDOFF.md`
2. `builderos-reboot/CURRENT_STATE.json`
3. `builderos-reboot/MISSION_QUEUE.json`
4. `builderos-reboot/PROJECT_CERTIFICATION.json`
5. `builderos-reboot/CURRENT_BP_GAPS_V1.md`
6. `docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md`
7. `factory-staging/factory-core/builder/run-step.js` (trace hot path)
8. `builderos-reboot/WORKSPACE_STATUS.md` — **must match** queue through 0030

### Run these commands (from repo root)

```bash
npm run factory:ci
node builderos-reboot/scripts/emit-project-certification.mjs
```

Optional if env set: `npm run builder:preflight`

If a command fails, say so — do not assume green from docs.

### Answer (evidence required: file path or command output)

1. Does **`npm run factory:ci`** pass? How many checks?
2. Do **truth docs** (`WORKSPACE_STATUS`, `CURRENT_STATE`, `MISSION_PACK_INDEX`) match **`MISSION_QUEUE.json`** (33 missions)?
3. Any **certification overclaims**? (e.g. `SAME_TIER_CODER_DETERMINISM` vs mechanical proxy only)
4. Does **`run-step.js`** actually run: intake → builder → SENTRY → TSOS → Historian on success?
5. Is there a **legacy builder queue** inside the new factory, or only mission blueprints?
6. Is **`FULL_LOOP_PROOF_RECEIPT.json`** honest (including C2)?
7. Could someone **rebuild factory-staging from the blueprint pack** without oral history?
8. Biggest **doc drift** or **false confidence** risk?

### Output format

**Verdict:** `NOT_READY` | `BOOTSTRAP_AND_STAGING_READY` (plus grade 1–10)

**Command receipts:** command → exit code → one line

**Findings:** F-01… severity (BLOCKER/HIGH/MED/LOW) → claim → evidence → fix

**Strong (max 5 bullets)**

**Next fixes (max 3, income-first if any product gap)**

## PROMPT END
