# Drift Sentinel (Local-Only) — System Spec

Drift Sentinel watches the council itself, not the user. It detects consensus drift before it affects outputs.

## Signals Detected
- Repeated phrasing / template lock-in
- Declining disagreement
- Rising certainty without evidence
- Consensus without tension

## Actions on Detection
- Shift voting weights toward dissenting roles
- Trigger a forced FSAR run
- Trigger role reshuffle
- Require a gold-standard re-evaluation

## Severity Scoring
Score each signal 0–100 and aggregate to a drift severity index.
- >= 80: force FSAR + role reshuffle + regression run
- 60–79: force regression run + prompt mutation
- < 60: warn + log

## Files
- `audit/drift/drift_metrics.js` — local signal scoring.
- `audit/drift/drift_sentinel.js` — generates JSON + MD reports.
- `scripts/run_drift_check.js` — CLI entry.
- `tests/drift_sentinel.test.js` — basic artifact checks.

## Usage
```bash
cat <<'DRIFTJSON' | node scripts/run_drift_check.js
{
  "messages": ["hello", "hello", "hello"],
  "votes": [{"spread": 0.1}, {"spread": 0.05}],
  "responses": [{"certainty": 0.8}, {"certainty": 0.75}]
}
DRIFTJSON
```

Outputs JSON + MD in `audit/reports/` with timestamped filenames.

## Notes
- Local-only; paid models are advisory-only if allowed by policy.
- Drift detection should feel slightly annoying; that's a feature, not a bug.
