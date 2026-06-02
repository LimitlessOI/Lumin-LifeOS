# AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note (G921-100)

This document serves as the SSOT foundation for closing the proof gap identified in AMENDMENT_41_MARKETINGOS.md, specifically regarding the end-to-end verification of user marketing opt-in status synchronization.

---

**1. Exact Missing Implementation or Proof Gap:**

The current gap is the lack of a verified, automated, and observable end-to-end data flow confirmation that a user's `marketingOptIn` status, as managed within LifeOS, is accurately and consistently reflected in the integrated MarketingOS platform. This includes both initial synchronization and subsequent state changes. The core gap is *observability of reconciliation* across system boundaries.

**2. Smallest Safe Build Slice to Close It:**

The smallest safe build slice focuses on establishing a dedicated, internal verification mechanism. This involves:
    a.  **LifeOS Internal Read Endpoint:** An internal, non-customer-facing API endpoint or service method within LifeOS to retrieve the canonical `marketingOptIn` status for a given `userId`. This endpoint must bypass UI layers and directly query the source of truth.
    b.  **MarketingOS Internal Read Endpoint:** A corresponding internal API endpoint or mechanism within MarketingOS to retrieve the *received* `marketingOptIn` status for the same `userId` as it exists within MarketingOS's data store.
    c.  **Verification Script/Harness:** A BuilderOS-managed script (e.g., a Node.js test script) that orchestrates calls to both internal endpoints, compares their outputs, and reports discrepancies. This script will operate on a set of controlled test users.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/services/marketingIntegrationService.js`: Add a new, internal-only method `getMarketingOptInStatus(userId)` to query LifeOS's current state. (If this service doesn't exist, create `src/services/marketing/marketingOptInService.js`.)
*   `src/api/internal/marketing/optInStatus.js`: Create a new internal API route `/internal/marketing/opt-in-status/:userId` that exposes the `getMarketingOptInStatus` method. This route must be secured for internal BuilderOS access only.
*   `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g921-100.md`: This document itself, serving as the blueprint for the proof.
*   `builderos/proofs/marketing-opt-in-sync.js`: A new BuilderOS-managed script to execute the verification logic.

**4. Verifier/Runtime Checks:**

*   **Test User Setup:** Provision a minimum of three dedicated test users:
    *   User A: `marketingOptIn: true`
    *   User B: `marketingOptIn: false`
    *   User C: `marketingOptIn: true` (then changed to `false` during the test run)
*   **LifeOS State Query:** For each test user, call `GET /internal/marketing/opt-in-status/:userId` on LifeOS.
*   **MarketingOS State Query:** For each test user, call the equivalent internal MarketingOS API to retrieve their `marketingOptIn` status.
*   **Comparison Assertion:** Assert that the `marketingOptIn` status retrieved from LifeOS *exactly matches* the status retrieved from MarketingOS for all test users.
*   **Propagation Latency Check:** For User C, after changing their status in LifeOS, poll MarketingOS's status endpoint at regular intervals (e.g., every 30 seconds) and record the time until the status matches. Assert this latency is within acceptable bounds (e.g., < 5 minutes).
*   **Error Handling:** Verify that API calls return expected error codes for non-existent users or invalid requests.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   **Status Mismatch:** If, for any test user, the `marketingOptIn` status retrieved from LifeOS does not match the status retrieved from MarketingOS after a defined propagation delay (e.g., 5 minutes post-change).
*   **API Failure:** If either the LifeOS internal API or the MarketingOS internal API returns an unexpected error (e.g., 5xx status, malformed response) during the verification