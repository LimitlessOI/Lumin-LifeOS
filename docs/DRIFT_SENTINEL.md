# Drift Sentinel (Local-Only)

Detects drift signals in council outputs and produces JSON + Markdown reports in `audit/reports/`.

Signals detected:
- Repeated phrasing
- Declining disagreement
- Rising certainty without evidence

Recommendations may include role reshuffle, reweighting, or forced FSAR.

## Files
- `audit/drift/drift_metrics.js` — lightweight local signal scoring.
- `audit/drift/drift_sentinel.js` — generates reports (JSON + MD).
- `scripts/run_drift_check.js` — CLI entry.
- `tests/drift_sentinel.test.js` — basic shape + artifact checks.

## Usage
```bash
# Example payload via stdin
cat <<'EOF' | node scripts/run_drift_check.js
{
  "messages": ["hello", "hello", "hello"],
  "votes": [{"spread": 0.1}, {"spread": 0.05}],
  "responses": [{"certainty": 0.8}, {"certainty": 0.75}]
}
EOF
```
Outputs: JSON + MD in `audit/reports/` with timestamped filenames.

## Notes
- Local-only; no paid APIs.
- Severity heuristic: combines repeated phrasing, declining disagreement, rising certainty into a 0–100 score.
- High severity triggers stronger recommendations (e.g., forced FSAR).
