# Amendment 41: MarketingOS Proof G373-100 - SSOT Foundation Blueprint Note

This document outlines the proof-closing blueprint note for establishing the Single Source of Truth (SSOT) foundation for MarketingOS proof-point G373-100, as specified in Amendment 41.

---

### 1. Exact Missing Implementation or Proof Gap

The LifeOS platform currently lacks a dedicated internal API endpoint and associated service logic responsible for calculating and exposing the `g373_100_conversion_rate` metric. This metric is critical for MarketingOS to establish a definitive, auditable SSOT for campaign performance proof-point G373-100, as outlined in `docs/projects/AMENDMENT_41_MARKETINGOS.md`. The absence of this endpoint prevents MarketingOS from programmatically retrieving the canonical conversion rate data directly from LifeOS.

### 2. Smallest Safe Build Slice to Close It

Implement a new, internal-only API endpoint within LifeOS that, upon request, computes the `g373_100_conversion_rate` based on existing user activity and event data. This slice will include:
*   A new service function to encapsulate the `g373_100_conversion_rate` calculation logic.
*   A new internal API route to expose this metric.
*   Integration of this route into the existing internal API router.
This slice focuses solely on the data computation and exposure from LifeOS, without implementing any MarketingOS-side consumption logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingosProofService.js` (New file: Contains the `calculateG373_100ConversionRate` function.)
*   `src/routes/internal/marketingosProofs.js` (New file: Defines the `/internal/marketingos/proofs/g373-100` GET route.)
*   `src/app.js` (Modification: Imports and registers the new `marketingosProofs` router under `/internal`.)
*   `src/models/userActivity.js` (Read-only access: Assumed existing model for querying user conversion events.)

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `test/services/marketingosProofService.test.js`: Verify `calculateG373_100ConversionRate` returns correct values for various mock user activity datasets (e.g., zero conversions, 100% conversions, partial conversions).
    *   `test/routes/internal/marketingosProofs.test.js`: Verify the `/internal/marketingos/proofs/g373-100` endpoint returns a 200 OK status and a JSON object with a `g373_100_conversion_rate` field (number type).
*   **Integration Tests:**
    *   Deploy to a staging environment.
    *   Execute an HTTP GET request to `https://[STAGING_LIFEOS_URL]/internal/marketingos/proofs/g373-100`.
    *   Assert the response structure: `{ "g373_100_conversion_rate": <number> }`.
    *   Manually verify the returned `g373_100_conversion_rate` against known test data or a small, controlled dataset.
*   **Monitoring:**
    *