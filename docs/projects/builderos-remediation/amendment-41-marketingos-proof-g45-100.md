# AMENDMENT_41_MARKETINGOS - Proof G45-100 Closing Blueprint Note

This document serves as the Single Source of Truth (SSOT) foundation for closing proof gap G45-100 related to Amendment 41: MarketingOS Integration.

---

1.  **Exact missing implementation or proof gap:**
    The current LifeOS platform lacks a robust, automated, and verifiable mechanism to confirm that the `G45-100` user segment (e.g., "Users who completed onboarding step 3 and have an active subscription") is accurately identified, extracted, and successfully synchronized from LifeOS to MarketingOS. Specifically, there is no direct, programmatic proof that MarketingOS has received, acknowledged, and correctly interpreted the specific user IDs belonging to segment `G45-100` as defined by LifeOS.

2.  **Smallest safe build slice to close it:**
    Implement a new `MarketingOSSegmentProofService` within LifeOS. This service will expose a method, `proveSegmentSync(segmentId, sampleUserIds)`, which will:
    a.  Take a `segmentId` (e.g., `G45-100`) and a small, cryptographically hashed sample of user IDs belonging to that segment.
    b.  Initiate an idempotent, lightweight API call to a dedicated MarketingOS proof endpoint (`/api/v1/segments/proof-of-sync`).
    c.  Expect a specific confirmation response from MarketingOS indicating receipt and basic integrity check of the segment proof.
    This service will be invoked immediately after the `G45-100` segment generation job completes, but *before* the full segment data transfer, acting as a pre-flight check.

3.  **Exact safe-scope files to touch first:**
    *   `src/services/marketingos/MarketingOSSegmentProofService.js` (New file: Implements the proof logic and API call.)
    *   `src/services/marketingos/index.js` (Modify: Export `MarketingOSSegmentProofService`.)
    *   `src/jobs/segment-generation/segmentG45-100-job.js` (Modify: Integrate the call to `MarketingOSSegmentProofService.proveSegmentSync` after segment computation.)
    *   `src/config/marketingos.js` (Modify: Add `MARKETINGOS_PROOF_ENDPOINT` environment variable and default.)
    *   `src/tests/services/marketingos/MarketingOSSegmentProofService.test.js` (New file: Unit tests for the proof service.)

4.  **Verifier/runtime checks:**
    *   **LifeOS Runtime Check 1 (Service Invocation):** Verify that `MarketingOSSegmentProofService.proveSegmentSync('G45-100', ...)` is invoked successfully with a non-empty sample of user IDs immediately following the `G45-100` segment generation job completion. Log the invocation with a unique correlation ID.
    *   **LifeOS Runtime Check 2 (API Response):** Monitor the HTTP response from MarketingOS's proof endpoint. Expect a `200 OK` status code and a JSON payload containing `{ "segmentId": "G45-100", "status": "PROOF_RECEIVED_AND_VALIDATED", "timestamp": "..." }`. Log the full response.
    *   **LifeOS Runtime Check 3 (Error Handling):** Ensure that any non-`200 OK` response or malformed payload from MarketingOS triggers an immediate alert and logs the full error details.
    *   **MarketingOS (Conceptual Check - external system):** MarketingOS should log the receipt of the proof request for `G