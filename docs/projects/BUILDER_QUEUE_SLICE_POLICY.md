# Builder queue — comparable slices (telemetry discipline)

If one slice is **`POST /build`** on a Markdown spec and the next rewires a **`40k` overlay**, wall-time trend lines **mix incomparable workloads**. Slowing down is sometimes **chosen quality** or **infra** (**502 retries**), not “regression.”

## Rules of thumb

1. **Separate reset from execution** — use **`npm run lifeos:builder:queue:reset-cursor`** (`--reset-cursor-only`). **Never** rely on **`--reset-cursor`** in the same invocation as a full unattended run unless you intend to drain **`BUILDER_QUEUE_MAX=999`**.
2. **Homogeneous batches for trend readability** — e.g. **`BUILDER_QUEUE_MAX=3`** on a **`markdown_spec`** band (see JSONL **`slice_profile`**) before switching to **`overlay_html`** tasks.
3. **Tag interpretation** — JSONL **`task_*`** carries **`slice_profile`** (`markdown_spec`, `overlay_html`, `stylesheet`, `javascript`). Filter mentally or extend meter scripts before calling a slower slice a “skill regression.”
4. **Infrastructure signal** — repeated **`task_retry`** + **502** inflates **`build_wall_ms`**; treat as **Railway/deploy edge variance** parallel track to council quality (`docs/BUILDER_TRUTH_AND_THROUGHPUT.md`).
5. **Self-repair path** — bad codegen → **`GET …/builder/gaps`**, verifier / route fixes, **`POST /builder/build`** redo with tightened **`spec`** — not permanent IDE patching of product files.

6. **Markdown target contract (platform gap)** — **`target_file` ending `.md`** must **reject** HTML boilerplate (`<!DOCTYPE`, `<html`). **THINK:** add `markdownFullFileCodegenHints()` + gate in **`routes/lifeos-council-builder-routes.js`** mirroring HTML contract. **KNOW:** **`DASHBOARD_WIDGET_DENSITY_SPEC.md`**, **`DASHBOARD_A11Y_SPEC.md`**, **`DASHBOARD_CATEGORY_STUBS_SPEC.md`** were corrupted with HTML and **GAP-FILL**’d to real Markdown this session.
