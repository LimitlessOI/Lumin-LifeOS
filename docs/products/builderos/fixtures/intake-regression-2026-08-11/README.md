<!-- SYNOPSIS: Regression fixture for BuilderOS governance repair — frozen Overlay intake that invented architecture. -->

# BuilderOS intake regression fixture (2026-08-11 Overlay)

**Do not execute session `000146ae-7ed9-4e23-9477-5139603e32f7`.**
**Do not “help” the repaired factory by pre-cleaning the Overlay blueprint before the regression run.**

## Purpose

Preserve the real, broken BuilderOS intake output that:

1. Invented full SQL schemas where intent had `columns: []`
2. Invented a competing SSOT path from the document title while session `product_name` was `universal-overlay`
3. Carried stale terminology (`Presiding Steward` after `Conductor` ratification)
4. Set `arc_report_json.ready_to_execute: true` from structural checks only
5. Had no product-level Sentry authorization for `universal-overlay`

After the governance repair blueprint is implemented, the success test is:

> Re-run essentially the same input. BuilderOS itself must detect these defects and refuse execution authorization — without Adam or Cursor catching unauthorized decisions in nested JSON.

Only after that regression PASS may Overlay return through the repaired factory as a real manufacturing attempt.

## Files

| File | Role |
|---|---|
| `SESSION_000146ae_ready_invented_architecture.json` | Frozen tip session (full payload) |
| `EXPECTED_DEFECTS.json` | Required detections + fixture hash |
| `README.md` | This file |

## Related blueprint

`docs/products/builderos/BUILDEROS_GOVERNANCE_REPAIR_BLUEPRINT_2026-08-11.md`
