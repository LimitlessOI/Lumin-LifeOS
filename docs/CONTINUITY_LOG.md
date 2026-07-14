<!-- SYNOPSIS: Continuity Log -->

---

## 2026-07-14 — ClientCare money path (birth→billing)

Operator routes live on tip (`birth-activity`, `prepare-claim-status`, persisted `clientcare_browser_jobs`). KNOW: 2026 births found; directory clear yields ~235 clients; 3 births resolve to billing hrefs with insurers (Sierra/BCBS/Cigna). Claim-status apply runs + Save nearest controls, but after-reload status still blank — suspect Kendo DropDownList over native select (`page.select` hung on tip). NEXT: Kendo widget `.value()` force + verify persist, then ChargeSlip for those 3, then raise name-resolve budget for remaining births.

## 2026-07-12 — BuilderOS Perfect Day s12 gate reset

Reset `docs/products/lifeos/BUILD_QUEUE.json` `s12` from `blocked` to `pending` with `attempts: 0` and cleared `s11` stale `last_error`/`last_attempt_at`. `services/governed-autonomous-shipping-loop.js` `markShippedStepsDone` now clears `last_error`, `last_attempt_at`, and `attempts` when a step is actually done, so future ships are not poisoned by transient failures. `NEVER_STOP_BOOT_DELAY_MS` and `GOVERNED_AUTONOMOUS_SHIP_INTERVAL_MS` will be reduced to ~60s and ~5m so the governed loop can ship `routes/lifeos-perfect-day-routes.js` and prove `GET /api/v1/lifeos/perfect-day/health` live. `docs/products/lifeos/PRODUCT_HOME.md` and `docs/products/builderos/PRODUCT_HOME.md` updated.
