# Builder autonomy — idea filters: refine, don’t discard

**Purpose:** When autonomous builders, councils, or conductors evaluate directions (“filters”), **the job is to sharpen an idea**, not to delete ambition because today’s stack cannot absorb it whole-cloth.

**Last updated:** 2026-05-03

---

## Core stance

- **Filters refine.** A concern (“too expensive”, “no verifier”, “deploy drift”) becomes a **design constraint** and an **ordered backlog**, not a veto unless North Star or safety requires halt.
- **Future lookback.** Before rejecting a pattern competitors ship, ask: *will we wish we had instrumented this earlier?* Receipts (`JSONL`, **`last-run`**, **`/builder/gaps`**) exist so the next session sees **what happened**, not a heroic narrative.
- **Unintended consequences.** Surprises are expected at autonomy boundaries (merge policy, token burn, silent idle). Each surprise feeds **one durable lever** — SSOT row, env knob, or verifier — per **`BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`**.
- **Barriers as prompts.** “Impossible” is often “not broken down yet.” Ask: *If there were no limits, what would we want?* Then **sequence** the barriers away (branch policy → telemetry → gates → tests), not fantasize in one shot.

---

## Operational checklist (when a filter fires)

| Signal | Refine (don’t stop) |
|--------|---------------------|
| Commits land on **default branch** | Set **`BUILDER_QUEUE_COMMIT_BRANCH`** or per-task **`branch`** — tier‑1 trust ramp (`BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`). |
| **Idle queue** | Truthful idle telemetry — append tasks, wrap cursor, or admit gaps; **do not** pretend throughput. |
| **Cost spike** | Log **`model_used`** / wall time per slice; tighten **`BUILDER_QUEUE_MAX`**, models, or supervise depth — measure before debating “fewer agents”. |
| **Deploy drift** (`/domains` **404**) | Redeploy + diagnose — **system** path first (`docs/ops/BUILDER_PRODUCTION_FIX.md`). |

---

## Relation to North Star

- **§2.6** — Filters never excuse misleading status (“green when red”). Refinement **with receipts** is compliant; silent downgrade is not.
- **§2.11 / §2.11c** — Conductor supervises; **recorded** **`gate-change` / `run-council`** resolves load-bearing forks — not permanent “no because hard.”

---

## See also

- **`docs/BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`** — trust tiers, review-before-main.
- **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`** — evaluate → fix → improve one lever per slice.
- **`docs/SUPERVISOR_CONSEQUENCE_LENS.md`** — optional premortem for heavy slices.
