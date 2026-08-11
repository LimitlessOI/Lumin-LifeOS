<!-- SYNOPSIS: Regression fixture for BuilderOS governance repair — frozen Overlay intake that invented architecture. -->

# BuilderOS intake regression fixture (2026-08-11 Overlay)

**Do not execute session `000146ae-7ed9-4e23-9477-5139603e32f7`.**
**Do not “help” the repaired factory by pre-cleaning the Overlay blueprint before the regression run.**
**Do not sanitize this fixture as fixes land — session bytes are pinned by sha256 in `EXPECTED_DEFECTS.json`.**

## Purpose

Preserve the real, broken BuilderOS intake output that:

1. Invented full SQL schemas where intent had `columns: []`
2. Invented a competing SSOT path from the document title while session `product_name` was `universal-overlay`
3. Carried stale terminology (`Presiding Steward` after `Conductor` ratification)
4. Set `arc_report_json.ready_to_execute: true` from structural checks only
5. Had no product-level Sentry authorization for `universal-overlay`

Architectural transition: the Overlay is not what we are trying to force through BuilderOS; **this broken intake is the instrument that proves BuilderOS deserves to build the Overlay.**

After the governance repair blueprint is implemented, harness PASS requires:

1. Detecting the required defects (not only “some error”)
2. Demonstrating the full loop with receipts: detect → classify → route → resolve → amend → invalidate → revalidate → authorize → execute
3. Proving resolve/amend does **not** manufacture a fifth unauthorized architectural decision
4. Acceptance criterion: **Overlay reaches execution without human nested-JSON rescue** (post re-entry)

## Files

| File | Role |
|---|---|
| `SESSION_000146ae_ready_invented_architecture.json` | Frozen tip session (full payload) — **immutable** |
| `EXPECTED_DEFECTS.json` | Required detections + fixture hash |
| `README.md` | This file |

## Related blueprint

`docs/products/builderos/BUILDEROS_GOVERNANCE_REPAIR_BLUEPRINT_2026-08-11.md`
