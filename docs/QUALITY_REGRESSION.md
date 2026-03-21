# Quality Regression (Local-Only) — System Spec

Quality Regression runs gold tasks, scores with rubrics, and emits regression reports.
This prevents silent quality decay and enforces periodic re-competition between models.

## Goals
- Detect silent degradation even when the system still "works."
- Compare current outputs to gold-standard baselines.
- Force re-evaluation when regression thresholds are exceeded.

## Files
- `audit/quality/gold_tasks.json` — gold task definitions
- `audit/quality/rubrics.json` — expected keywords + thresholds
- `audit/quality/regression_runner.js` — runs tasks, scores, writes reports
- `scripts/run_quality_regression.js` — CLI entry
- `tests/quality_regression.test.js` — verifies artifacts + shape

## Behavior
- Executes each gold task (stubbed model output today; keep interface for future wiring)
- Scores output against rubric keywords and thresholds
- Produces per-task deltas vs baseline and pass/fail
- Summary marks overall pass only if all tasks pass

## Cadence
- Monthly regression run (minimum)
- Forced run after drift sentinel severity >= 60
- Required run before major releases

## Run
```bash
node scripts/run_quality_regression.js
```

Outputs: `audit/reports/quality_regression_<timestamp>.json` and `.md` with scores, hits, deltas, and pass/fail flags.
