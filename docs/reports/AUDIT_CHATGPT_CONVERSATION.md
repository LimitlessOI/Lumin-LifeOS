<!-- SYNOPSIS: ChatGPT Conversation Audit — BuilderOS 5/10 Review -->

# ChatGPT Conversation Audit — BuilderOS 5/10 Review

**Source:** `really great ideas for system .rtfd` (extracted 2026-08-02)  
**Mission owner:** `FACTORY-REPAIR-AND-AUTONOMY-0001`  
**Product SSOT:** `docs/products/builderos/PRODUCT_HOME.md`

## TL;DR

The conversation gives BuilderOS an honest **5/10** as a *trustworthy autonomous software-building company* — not as code completion. The score is fair and the fixes it names are the exact ones already surfacing in this session. The highest-leverage item, a **branch-divergence guard**, is missing from the active blueprint and should become FRA-007.

## What the review got right (KNOW)

- Branch-divergence silently broke every "live" claim for 10 days. This is the single biggest autonomy gap.
- `builder:preflight` green while `bp-priority:verify` red is a two-truth problem the constitution forbids.
- Model capability ledger only measures 2 of 9 named roles, so "authority through evidence" is unproven for most decisions.
- Founder Intent Model only preserves intent; it does not predict/compare/measure accuracy.
- Two migrations were degraded on every boot and nobody noticed — a real "Observe" blind spot.
- GAP-FILL work is self-proposed, self-executed, and self-verified by one agent. That violates §D.5A role separation.

## What is already represented in the system

| Conversation idea | Where it already lives | Status |
|---|---|---|
| Consensus quality standard (objections answered/deferred/withdrawn) | `docs/constitution/NORTH_STAR_SSOT.md` Article II §2.12a | installed |
| Consensus must survive contact with reality | `NORTH_STAR_SSOT.md` + `SENTRY` Layer A/B | installed |
| Decision Record artifact with per-role reasoning | `builderos-reboot/DECISIONS/` + `TEN_OUT_OF_TEN_DEFINITION.md` | installed |
| Never-stop factory / BUILD_QUEUE execution | `services/never-stop-product-factory.js` + `bp-priority-never-stop.mjs` | installed |
| Deterministic drift repair + lessons log | `scripts/build-queue-drift-repair.mjs` + `data/build-queue-drift-lessons.jsonl` | installed (v2, committed) |
| Overnight self-scheduling daemon | `FACTORY-REPAIR-AND-AUTONOMY-0001` phase P3 | in progress |
| Runtime constitutional protocols | `FACTORY-REPAIR-AND-AUTONOMY-0001` phase P4 | in progress |
| Empirical benchmark harness | `FACTORY-REPAIR-AND-AUTONOMY-0001` phase P6 | in progress |
| Import Memory for external conversations | `docs/products/memory-intelligence/` (scaffold) / `ideavault` | not yet a mission |

## What is missing and needs to be added to the blueprint

1. **Branch-divergence guard (FRA-007-A).** A preflight/redeploy gate that HALTS if the active branch is not `main` or is >N commits behind `origin/main`. This would have caught the 10-day silent failure on day one.
2. **Single canonical pass/fail gate (FRA-007-B).** Merge `migration:preflight` into the one `builder:preflight` truth so `builder:preflight` green means the whole system is commit-safe.
3. **Independent GAP-FILL verification (FRA-007-C).** Before a hand-authored repair is called `done`, run a cheap second-model sanity pass or deterministic SENTRY re-evaluation that did not author the fix.
4. **Scheduled prod-degraded probe (FRA-007-D).** A cheap cron/scheduled job that probes production health and pages/logs before the founder has to ask. Targets the migration-fail-on-boot blind spot.
5. **Model capability ledger for all 9 named roles (FRA-007-E).** Extend `services/model-capability-ledger.js` to track outcomes for BPB, OIL review, Verifier, Summarizer, Historian, Founder Intent Model, Security Review, and External Research.
6. **Founder Intent Model predict/compare half (FRA-007-F).** Add prediction + accuracy measurement to `services/founder-intent-model.js`, not just preservation.
7. **Import Memory / conversation ingestion (deferred product mission).** Treat ChatGPT/Claude/Devin/Cursor/email/notes as intellectual history, extract ideas, build timeline, surface contradictions, update Digital Twin. This is a LifeOS/memory-intelligence feature, not a BuilderOS repair task.

## Prioritization

1. **Branch-divergence guard** — cheapest, prevents repeats, highest leverage. Do first.
2. **Canonical pass/fail gate + prod-degraded probe** — closes the two-truth and silent-failure problems. Do second.
3. **Independent GAP-FILL verification + model ledger expansion** — restores trust in the conductor's manual fixes and model selection. Do third.
4. **Founder Intent Model predict/compare + Import Memory** — harder, product-shaped, should follow the repair foundation.

## Our take vs. the conversation's take

- **Agree:** branch-divergence is #1. Independent verification is #2. Founder Intent Model needs the harder half.
- **Disagree on ordering:** the conversation ranks "wrap commitManyToGitHub" above migration collision cleanup. Migration collision is static debt; the open pipe is actively growing debt. We still side with fixing the open-pipe / branch-divergence gate first.
- **Disagree on scope:** Import Memory is a strong LifeOS feature but it should not distract from making BuilderOS trustworthy first. It should become its own mission once FRA-0001 is technically passing.

## Copy/paste Cloud Code prompts

Use these as three sequential prompts. They assume the repo is `LimitlessOI/Lumin-LifeOS` and the active mission is `FACTORY-REPAIR-AND-AUTONOMY-0001`.

### Prompt 1 — Branch-divergence guard and canonical gate

```text
In LimitlessOI/Lumin-LifeOS, implement FRA-007-A and FRA-007-B for mission FACTORY-REPAIR-AND-AUTONOMY-0001.

FRA-007-A: Add a branch-divergence guard to the preflight/deploy pipeline. Before any commit, build, or redeploy that claims "production is live", halt with a clear error if the current git branch is not "main" or if origin/main is ahead by more than 0 commits. Wire this into scripts/system-commit-files.mjs and scripts/system-railway-redeploy.mjs.

FRA-007-B: Make npm run builder:preflight the single canonical green/red gate. Merge migration:preflight checks (duplicate CREATE TABLE collision, SQL wrapped in JS template literals, etc.) into builder:preflight so a green builder:preflight means commit-safe. Do not keep a separate migration:preflight command as a hidden second gate.

Add/update acceptance tests, ensure npm run builder:preflight passes, commit via npm run system:commit-files, and redeploy via npm run system:railway:redeploy. Report the final commit SHA.
```

### Prompt 2 — Independent verification for GAP-FILL and prod-degraded probe

```text
In LimitlessOI/Lumin-LifeOS, implement FRA-007-C and FRA-007-D for mission FACTORY-REPAIR-AND-AUTONOMY-0001.

FRA-007-C: Before any hand-authored GAP-FILL file is committed, require a second verification pass that did not author the fix. Use the cheapest model or a deterministic SENTRY re-run to confirm the repair still passes artifact proof. Log the independent verification result into data/build-queue-drift-lessons.jsonl.

FRA-007-D: Add a scheduled/cron prod-degraded probe that runs every 5 minutes. It should call the production /ready endpoint, check the live Railway deploy SHA matches origin/main, and attempt a lightweight DB migration idempotency check. If either fails, log an alert and, if a notification channel is configured, page. Keep it cheap (no model calls).

Update the FACTORY-REPAIR-AND-AUTONOMY-0001 BLUEPRINT.json and FOUNDER_PACKET.md to include these steps. Ensure npm run builder:preflight passes, commit via npm run system:commit-files, and redeploy.
```

### Prompt 3 — Model ledger role coverage and Founder Intent Model accuracy

```text
In LimitlessOI/Lumin-LifeOS, implement FRA-007-E and FRA-007-F for mission FACTORY-REPAIR-AND-AUTONOMY-0001.

FRA-007-E: Extend services/model-capability-ledger.js to track outcomes for all 9 named roles: builderos_execution, aic_debate, BPB blueprinting, OIL review, Verifier, Summarizer, Historian, Founder Intent Model, Security Review, and External Research. If historical data is missing, create the schema and start recording zero/empty baselines. Make the ledger queryable via a CLI script.

FRA-007-F: Extend services/founder-intent-model.js beyond "preserve intent". Add a prediction path: before a mission runs, record predicted intent fit; after it runs, compare prediction to actual outcome and store accuracy. Expose a function getFounderIntentAccuracy().

Update tests, ensure npm run builder:preflight passes, commit via npm run system:commit-files, and redeploy.
```

### Prompt 4 — Import Memory product mission (defer until FRA-0001 passes)

```text
In LimitlessOI/Lumin-LifeOS, once FACTORY-REPAIR-AND-AUTONOMY-0001 is TECHNICAL_PASS, create a new mission for Import Memory.

Mission: Import external conversation sources (ChatGPT, Claude, Gemini, Cursor, Devin, email, notes, journals, documents), extract ideas, build a timeline, connect related concepts, flag contradictions, and update the user's Digital Twin / Wisdom / Decision Records.

Create the mission pack under builderos-reboot/MISSIONS/IMPORT-MEMORY-0001/ with FOUNDER_PACKET.md and BLUEPRINT.json, add it to builderos-reboot/BP_PRIORITY.json with correct rank, and wire the first step as a deterministic ingestion pipeline for .txt / .md / .json conversation exports. Do not build UI until the ingestion pipeline passes SENTRY.
```

## Recommendation

Run Prompt 1 immediately. It is the smallest change with the largest trust return. Prompts 2 and 3 can follow in order. Prompt 4 should wait until BuilderOS can honestly claim the autonomy pipeline is not silently drifting.
