# Future-State Adversarial Retrospection (FSAR) — Scaffold

This scaffold implements a local-only FSAR runner that generates both JSON and Markdown artifacts for a proposal.

**System law:** “No decision is complete until future-us has tried to destroy it.”  
FSAR runs are therefore **required**, not optional, before decisions are treated as complete.

## Files
- `audit/fsar/fsar_runner.js` — core runner; generates JSON + MD artifacts under `audit/reports/`.
- `audit/fsar/fsar_schema.json` — JSON schema for FSAR reports.
- `audit/fsar/prompts/fsar_proposal.md` — Temporal Adversary system prompt (no-fluff, severity-driven).
- `scripts/run_fsr_proposal.js` — CLI entry to run FSAR for a proposal string.
- `tests/fsar_artifact.test.js` — basic shape + artifact existence check.

## Usage
```bash
# from repo root
node scripts/run_fsr_proposal.js "Migrate execution engine to new model router"
# or pipe from stdin
cat proposal.txt | node scripts/run_fsr_proposal.js
```

Artifacts land in `audit/reports/` with timestamped filenames (JSON + MD).

## Current behavior
- Local-only; no paid APIs.
- Stubbed severity/risks/mitigations while council wiring is pending.
- `block_execution` is `true` when severity >= 7 (placeholder policy).

## Next steps (future work)
- Wire to council models for real adversarial reasoning.
- Enforce policy-based severity thresholds.
- Integrate with execution gating once placement is approved.
- Add scheduled/systemwide FSAR variants.
