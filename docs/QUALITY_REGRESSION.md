# Quality Regression (Local-Only)

Runs gold tasks, scores with rubrics, and emits regression reports (JSON + Markdown) to `audit/reports/`.

## Files
- `audit/quality/gold_tasks.json` — gold task definitions
- `audit/quality/rubrics.json` — expected keywords + thresholds
- `audit/quality/regression_runner.js` — runs tasks, scores, writes reports
- `scripts/run_quality_regression.js` — CLI entry
- `tests/quality_regression.test.js` — verifies artifacts + shape

## Behavior
- Executes each gold task (stubbed model output today; keep interface for future wiring)
- Scores output against rubric keywords
- Produces per-task deltas vs baseline and pass/fail
- Summary marks overall pass only if all tasks pass

## Run
```bash
node scripts/run_quality_regression.js
```

Outputs: `audit/reports/quality_regression_<timestamp>.json` and `.md` with scores, hits, deltas, and pass/fail flags.
