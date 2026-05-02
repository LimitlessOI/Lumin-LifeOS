# Builder truth channel + throughput (operator)

**Purpose:** Measure slice time, ETA to MVP corridor, variance vs baseline, and tie supervision to **evidence**—not reassurance language.

Contrary readings are **valuable telemetry**. A slower rolling average says “something changed” — target weight, verifier strictness, retries, infra, or intentional quality trade-offs — not personal failure.

## Per-slice time (machine)

Since **`scripts/lifeos-builder-continuous-queue.mjs`** updates:

- **`task_ok` / `task_fail` / `task_error`** lines in **`data/builder-continuous-queue-log.jsonl`** include **`build_wall_ms`** (wall time for **`POST /api/v1/lifeos/builder/build`** for that queue row, retries included inside that call) and **`slice_profile`** (`markdown_spec`, `overlay_html`, `stylesheet`, `javascript`) for **like-with-like trending** (**`npm run lifeos:builder:throughput-meter -- --profile markdown_spec`** filters baselines).

- Comparable batching playbook: **`docs/projects/BUILDER_QUEUE_SLICE_POLICY.md`**.

- **`data/builder-continuous-queue-last-run.json`** includes **`per_task_slice`**: `{ id, build_wall_ms, ok }[]` for the last batch.

## MVP ETA meter

```bash
npm run lifeos:builder:throughput-meter
npm run lifeos:builder:throughput-meter -- --write-receipt
```

- **Scope:** **`docs/projects/LIFEOS_MVP_THROUGHPUT_SCOPE.json`** — MVP is tasks **before** **`mvp_exclusive_tail_task_id`** (**`dashboard-shell-audit`** aligns with alpha tail).
- **Cursor:** same slug as **`lifeos-builder-continuous-queue.mjs`** (from queue JSON filename unless overridden).
- **Baseline vs rolling:** env **`BUILDER_METER_BASELINE_N`** (default 10 earliest OK slices with timing), **`BUILDER_METER_ROLLING_N`** (default 5).
- **Output:** ETA ≈ **`pace × mvp_remaining`**, trend label (**`slower_than_baseline`**, **`faster_than_baseline`**, **`flat_vs_baseline`**), **`loop_signal`** (idle slice / elevated fail rate).

Tune ratios: **`BUILDER_METER_REGRESS_RATIO`** (default **`1.12`**), **`BUILDER_METER_IMPROVE_RATIO`** (default **`0.88`**).

## Supervision pairing (truth over comfort)

After each **`committed`** slice the supervisor role:

1. **Reads `target_file` end-to-end** (builder output + diff story).
2. **Runs deterministic gates** (**`npm run lifeos:supervise:static`**, **`npm run check:overlay`**) where overlays moved.
3. **Checks **`GET /api/v1/lifeos/builder/gaps`**** for systemic defects — **GAP-FILL platform** fixes, not lone hero patches (`docs/SUPERVISION_CODE_READ_CONTRACT.md`).
4. **Runs this meter** to keep variance visible.

We seek **truth** (for or against the plan): **KNOW / THINK / GUESS** from evidence, never “looks good.”
