# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Proof G417-100

This document serves as the SSOT foundation for closing the proof gap identified in Amendment 41 concerning MarketingOS segment `g417-100`.

## 1. Exact Missing Implementation or Proof Gap

The exact missing implementation or proof gap is the lack of a verifiable, programmatic mechanism to confirm the accurate identification, real-time availability, and data consistency of the `g417-100` user segment (e.g., "Onboarded-No-Purchase") within the MarketingOS targeting system. Specifically, there is no dedicated BuilderOS endpoint or utility to query and validate the current state and composition of this segment against its defined criteria and expected population.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing a read-only BuilderOS API endpoint and an associated internal service function. This endpoint will expose a verification utility for specific MarketingOS segments. It will query the underlying LifeOS user data store (or the MarketingOS segment cache, if applicable) to:
1.  Retrieve the current count of users belonging to segment `g417-100`.
2.  Fetch a small, configurable sample of user IDs from this segment.
3.  Report the last known update timestamp for the segment data.

This slice is strictly read-only and does not modify any user data or MarketingOS configurations. Its sole purpose is to provide verifiable truth about segment `g417-100`.

## 3. Exact Safe-Scope Files to Touch First

*   `services/builder-os/src/segments/segmentVerifierService.js`: (New File) Implements the core logic for querying and verifying segment `g417-100`'s population and freshness. This service will interact with the LifeOS user data layer.
*   `services/builder-os/src/routes/builderApiRouter.js`: (Modification) Add a new GET route, e.g., `/v1/segments/:segmentId/verify`, which will delegate to `segmentVerifierService.js`.
*   `services/builder-os/src/controllers/segmentController.js`: (New File) Handles the request/response for the new segment verification route, orchestrating calls to `segmentVerifierService.js`.
*   `services/builder-os/tests/unit/segments/segmentVerifierService.test.js`: (New File) Unit tests for the `segmentVerifierService.js` logic.
*   `services/builder-os/tests/integration/builderApi.test.js`: (Modification) Add an integration test case for the new `/v1/segments/:segmentId/verify` endpoint, specifically for `g417-100`.

## 4. Verifier/Runtime Checks

Upon deployment of the build slice, the following runtime checks will be executed:

1.  **API Endpoint Accessibility:**
    *   **Action:** `GET /builder-api/v1/segments/g417-100/verify`
    *   **Expected Outcome:** HTTP Status 200 OK.
    *   **Response Structure:** JSON payload containing `count` (number), `sampleUserIds` (array of strings), `lastUpdatedAt` (ISO 8601 string).

2.  **Segment Population Count:**
    *