# AMENDMENT_41_MARKETINGOS Proof-Closing Blueprint Note: G487-100

This document serves as the SSOT foundation for closing the proof gap identified in AMENDMENT_41_MARKETINGOS, specifically for MarketingOS integration G487-100.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a dedicated, secure internal API endpoint within LifeOS that exposes the `userEngagementStatus` for a given user, as required by MarketingOS for targeted campaign segmentation (G487-100). The proof gap is demonstrating that MarketingOS can reliably query and receive this specific, computed user engagement status.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Implementing a new internal API route and controller in LifeOS.
*   Developing a service layer function to compute `userEngagementStatus` based on the user's `lastActivityAt` timestamp (e.g., active if `lastActivityAt` is within the last 7 days).
*   Ensuring the new endpoint is authenticated and authorized for internal BuilderOS/MarketingOS consumption only, adhering to existing internal API security patterns.

## 3. Exact Safe-Scope Files to Touch First

*   `src/routes/internal/marketingosRoutes.js` (New file: Defines the internal API route `/api/v1/internal/marketingos/user-engagement/:userId`)
*   `src/controllers/internal/marketingosController.js` (New file: Implements the logic for the `user-engagement` endpoint, calling the service layer)
*   `src/services/userEngagementService.js` (New file: Contains the business logic to calculate `userEngagementStatus`)
*   `src/models/user.js` (Extend if `lastActivityAt` field or its indexing needs adjustment, or add a virtual field for `userEngagementStatus` if appropriate for model-level computation)
*   `src/app.js` (Integrate `marketingosRoutes` into the internal API router)

## 4. Verifier/Runtime Checks

*   **API Endpoint Test:** Execute `GET /api/v1/internal/marketingos/user-engagement/:userId` with known active and inactive user IDs. Verify the `userEngagementStatus` in the response matches expected values.
*   **Authentication/Authorization Test:** Attempt to access the endpoint without proper internal authentication/authorization. Verify a 401/403 response.
*   **Integration Test:** MarketingOS team to perform a test query against the new endpoint in a staging environment and confirm successful data ingestion and correct interpretation of `userEngagementStatus`.
*   **Logging & Monitoring:** Monitor LifeOS internal API logs for successful calls from MarketingOS and any error rates.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The API endpoint consistently returns 4xx or 5xx errors for valid internal requests.
*   The `userEngagementStatus` returned by the API is incorrect for more than 1% of test users.
*   MarketingOS reports data discrepancies, schema mismatches, or an inability to consume the data as expected.
*   Observable performance degradation (e.g., increased latency, CPU/memory spikes) on LifeOS services after deployment of the new endpoint.
*   Security audit reveals vulnerabilities or improper access controls for the new internal endpoint.