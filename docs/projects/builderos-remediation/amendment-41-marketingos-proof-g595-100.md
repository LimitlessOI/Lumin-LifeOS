Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Proof G595-100 Remediation
This document outlines the plan to close the identified proof gap for `g595-100` as per `AMENDMENT_41_MARKETINGOS.md`, ensuring the SSOT foundation for MarketingOS data integrity.

1.  Exact Missing Implementation or Proof Gap:
    The current implementation lacks a robust, automated verification step to confirm the bidirectional synchronization integrity of `CustomerSegment` membership between MarketingOS and LifeOS `CustomerProfile` records. Specifically, `proof-g595-100` requires validation that a customer's `marketing_segment_ids` in LifeOS accurately reflect their active segment memberships in MarketingOS post-sync, and vice-versa, for all segments defined in `AMENDMENT_41_MARKETINGOS.md`. The gap is the absence of a dedicated, scheduled BuilderOS verification service that queries both MarketingOS segment membership APIs and LifeOS `CustomerProfile` records to assert consistency for a statistically significant sample of customers, flagging discrepancies for automated remediation or manual review. This service must specifically validate the `marketing_segment_ids` array in LifeOS against the source of truth in MarketingOS for `AMENDMENT_41_MARKETINGOS.md` defined segments.

2.  Smallest Safe Build Slice to Close It:
    Implement a new BuilderOS internal service, `MarketingOSSegmentVerifierService`, responsible for scheduled, read-only verification of `CustomerSegment` synchronization. This service will:
    a. Fetch a sample of `CustomerProfile` IDs from LifeOS.
    b. For each ID, query LifeOS `CustomerProfile` for `marketing_segment_ids`.
    c. Concurrently query MarketingOS for active segment memberships for the same customer.
    d. Compare the two sets of segment IDs, identifying discrepancies.
    e. Log discrepancies to a BuilderOS internal audit log and emit metrics for monitoring.
    This slice is read-only and operates entirely within BuilderOS, avoiding direct modifications to LifeOS or MarketingOS data during verification.

3.  Exact Safe-Scope Files to Touch First:
    - `builderos/services/MarketingOSSegmentVerifierService.js` (new file)
    - `builderos/config/verification-schedules.js` (add new schedule entry)
    - `builderos/utils/marketingos-api-client.js` (extend if needed for segment membership query)
    - `builderos/utils/lifeos-customer-profile-client.js` (extend if needed for `marketing_segment_ids` query)
    - `builderos/tests/unit/MarketingOSSegmentVerifierService.test.js` (new file)
    - `builderos/tests/integration/marketingos-segment-sync.test.js` (new file, focused on verification flow)

4.  Verifier/Runtime Checks:
    - **Unit Tests:** `MarketingOSSegmentVerifierService.test.js` covers core logic for comparison and discrepancy detection.
    - **Integration Tests:** `marketingos-segment-sync.test.js` simulates fetching data from mocked LifeOS/MarketingOS clients and asserts correct discrepancy reporting.
    - **Runtime Monitoring:**
        - `builderos.marketingos_segment_verifier.discrepancies_total` (gauge/counter) should be near zero.
        - `builderos.marketingos_segment_verifier.verification_runs_total` (counter) should increment per schedule.
        - `builderos.marketingos_segment_verifier.api_errors_total` (counter) should be zero.
    - **Audit Log Review:** Periodically review BuilderOS internal audit logs for `MarketingOSSegmentVerifierService` entries, specifically for `DISCREPANCY_DETECTED` events.

5.  Stop Conditions If Runtime Truth Disagrees:
    - **High Discrepancy Rate:** If `builderos.marketingos_segment_verifier.discrepancies_total` exceeds a predefined threshold (e.g., >0.1% of verified profiles) for three consecutive verification runs.
    - **Service Failure:** If `MarketingOSSegmentVerifierService` fails to complete its scheduled runs or reports persistent API errors (`builderos.marketingos_segment_verifier.api_errors_total` > 0 for 3 consecutive runs).
    - **Action:** Immediately pause the `MarketingOSSegmentVerifierService` schedule, trigger an alert to the BuilderOS operations team, and initiate a root cause analysis. Do not proceed with automated remediation until the underlying sync issue is identified and resolved.