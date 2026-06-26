<!-- SYNOPSIS: Machine layer / mission-pack authority -->

# Machine layer / mission-pack authority

You are in **`builderos-reboot/`** — governed mission packs and factory proofs.

---

## Two domains (do not confuse)

| Domain | What | Owner |
|--------|------|-------|
| **Active product work** | `BP_PRIORITY.json` → mission `BLUEPRINT.json` → acceptance | BPB / Machine (NOT Hist) |
| **History / legacy** | `MISSION_QUEUE.json`, overnight artifacts, autopilot scripts | **Hist (Historian)** |

**Adam locked:** Legacy files belong to **History**. **Historian domain owns them.** Read/salvage only — see `prompts/00-HIST-LEGACY-BOUNDARY.md`.

---

## CANONICAL — product work queue

**Blueprints in priority order ARE the queue.**

| Artifact | Role |
|----------|------|
| **`BP_PRIORITY.json`** | ONLY ordered list of product BPs to execute (rank 1 = active) |
| **`docs/products/PRODUCT_REGISTRY.json`** | Canonical product homes; read before mission details when shaping context |
| `MISSIONS/<id>/FOUNDER_PACKET.md` | Verbal digital twin — intended reality (WHAT) |
| `MISSIONS/<id>/BLUEPRINT.json` | Machine-buildable twin — ARC instructions (HOW) |
| `MISSIONS/<id>/OBJECTIVE_VERDICT.json` | Result scoreboard |
| Named acceptance npm script | PROOF |

**Governance (read first):** `docs/constitution/AMENDMENT_PACK_V2.0A.md` — intent front-loaded; no founder re-questions after handoff except defects or new reality. Metric: founder interruptions before Alpha.

**Product-home law:** product truth should be discovered from `docs/products/<product-id>/` before falling back to `docs/projects/AMENDMENT_*` files. Amendment files remain law/receipt anchors, not the primary product home.

**Registries:** `governance/ARTIFACT_ALIAS_REGISTRY.json`, `governance/GATE_ENFORCEMENT_MATRIX.json`, `governance/DEPARTMENT_ROLE_CONTRACT.json`, `governance/MISSION_PHASE_ARTIFACTS.json`

**Enforcement (HARD — Adam 2026-06-17):** Gates in `GATE_ENFORCEMENT_MATRIX.json` with `"enforcement": "HARD"` fail-closed in foundation + execute paths. **Doctrine verify:** `npm run builderos:doctrine:verify -- MISSION_ID` — no artifact discards, department role + measurement envelopes, acceptance exit 0 before healthy claim, `TWIN_DRIFT_REPORT` scores simulation vs reality (Hist lane). **Never-stop runner:** `npm run builderos:bp-priority:never-stop` walks `BP_PRIORITY.json` until complete or defect. **Founder stop only:** create `builderos-reboot/FOUNDER_STOP.json` with `{ "stop": true }` to halt the runner. **Token ledger:** `data/builderos-mission-ledger.jsonl` (+ `factory-staging/data/tsos-step-metrics.jsonl`). **Prediction vs reality:** `docs/ADF_PREDICTION_LEDGER_V1.md` + mission `PREDICTION_RECEIPT.json` / `RESULT_SCOREBOARD.json`.

---

## HIST DOMAIN — Historian owns (not product orchestration)

Registry: **`HIST_DOMAIN_REGISTRY.json`**

| Artifact | Hist ID |
|----------|---------|
| `MISSION_QUEUE.json` | HIST-AUTO-001 |
| `MISSION_PACK_INDEX.json` | HIST-AUTO-002 |
| Overnight / slice / receipt JSON | HIST-AUTO-003 |
| Autopilot scripts | HIST-AUTO-004 |
| `factory-autopilot-scheduler.js` | HIST-AUTO-005 |
| Governed overnight runners + backlog state | HIST-AUTO-006 |

Every Hist-owned file has `_authority.domain: Hist`, `owner_department: Historian`, `status: HIST_OWNED`.

**To touch Hist artifacts:** Hist mandatory case (`HIST_LEGACY_SYSTEM_REGISTRY.md` §4) — default HALT.

---

## Verify (HARD)

```bash
npm run lifeos:bp-priority:verify
```

Enforced: pre-commit step 10 (HARD, **no bypass**) + `builder:preflight`. Checks Hist banners, BP_PRIORITY shape, MISSION_QUEUE ban in spine, **BP item ↔ receipt ↔ OBJECTIVE_VERDICT alignment**, **acceptance scripts wired to `finishBpAcceptance`**, **PASS receipts must contain `bp_sync` proof**, **staged PASS receipts must co-commit BP artifacts**.

**Law (no oops path):**

| Layer | Enforcement |
|-------|-------------|
| Acceptance | `scripts/lib/bp-acceptance-finish.mjs` — only choke point; sync fails → exit 1 |
| Pre-commit | `verify-bp-priority-guardrails.mjs --staged` — always runs; no `BP_PRIORITY_GUARDRAILS=off` |
| Commit-msg | PASS receipt commits must acknowledge BP sync in message |
| Runtime verify | `npm run lifeos:bp-priority:verify` — 26+ checks |

See: `HIST_DOMAIN_REGISTRY.json`, `docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md` §2E
