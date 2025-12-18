# Audit System Overview

This document summarizes local-only audit utilities and how to run them.

**System law:** “No decision is complete until future-us has tried to destroy it.”  
→ FSAR runs are **required** (not optional) before decisions are considered complete.

## Components
- **FSAR** (`audit/fsar/fsar_runner.js`): Future-State Adversarial Retrospection; generates JSON/MD artifacts.
- **Execution Gate** (`audit/gating/execution_gate.js`): Applies policies to block/require review.
- **Drift Sentinel** (`audit/drift/drift_sentinel.js`): Detects phrasing/consensus/certainty drift; writes JSON/MD.
- **Quality Regression** (`audit/quality/regression_runner.js`): Runs gold tasks, scores with rubrics; writes JSON/MD.
- **Quarterly Rip-and-Replace** (`scripts/run_quarterly_rip_replace.js`): Captures current models, cost/latency hotspots, open-source alternatives, and mandatory justifications.

## Quarterly Rip-and-Replace Audit
Generates a JSON + Markdown report in `audit/reports/` with:
- Current models
- Cost hotspots
- Latency hotspots
- Open-source alternatives
- Mandatory justification for NOT switching

Run:
```bash
node scripts/run_quarterly_rip_replace.js
```

Optional: provide a JSON payload (arg or stdin) to override defaults:
```bash
cat <<'EOF' | node scripts/run_quarterly_rip_replace.js
{
  "current_models": [
    {"name": "openai_gpt4o", "role": "oversight", "cost_class": "paid"}
  ],
  "cost_hotspots": [
    {"area": "oversight", "model": "openai_gpt4o", "est_monthly": 200}
  ],
  "latency_hotspots": [
    {"area": "long_context", "model": "openai_gpt4o", "p95_ms": 9500}
  ],
  "open_source_alternatives": [
    {"replace": "openai_gpt4o", "alternative": "ollama_llama_3_3_70b", "notes": "Use when oversight risk is low."}
  ],
  "justifications": [
    {"model": "openai_gpt4o", "reason": "Needed for parity; reevaluate next quarter."}
  ]
}
EOF
```

Outputs: `audit/reports/quarterly_rip_replace_<timestamp>.json` and `.md`.

## Other Audit Commands
- Drift Sentinel: `node scripts/run_drift_check.js <payload-json>`
- Quality Regression: `node scripts/run_quality_regression.js`
- FSAR CLI: `node scripts/run_fsr_proposal.js "Proposal text"`

All audits are local-only and write artifacts to `audit/reports/`.
