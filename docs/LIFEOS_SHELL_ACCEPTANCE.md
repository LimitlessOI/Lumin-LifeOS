# LifeOS shell acceptance (operator)

**Purpose:** Fast proof that public overlays and core APIs match **LifeOS P1** expectations before demos or alpha testers.

## Automated (recommended)

```bash
npm run lifeos:operational-grade
```

**Passes when:** score **≥ 90** (override with **`TSOS_MIN_OPERATIONAL_SCORE`**) and critical checks green — includes **`/overlay/lifeos-dashboard.html`**, **`/overlay/lifeos-app.html`**, builder **`/ready`** **policy_revision** parity with repo, **`/ambient/nudge`**, **`/system/builder-health`**.

**Receipt:** `data/lifeos-operational-grade-last-run.json` (gitignored).

## Composite

```bash
npm run tsos:builder
```

Runs preflight → probe → doctor → token scorecard → daemon state summary → **operational grade** (step 6).

## Manual spot-check

1. Open **`/overlay/lifeos-app.html`** — shell chrome loads; navigate to dashboard route per **`LIFEOS_DASHBOARD_BUILDER_BRIEF.md`**.
2. **`/overlay/lifeos-dashboard.html`** — widgets render without console errors (browser devtools).

SSOT: **`docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`**, **`docs/projects/AMENDMENT_21_LIFEOS_CORE.md`**.
