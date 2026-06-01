Amendment 41: MarketingOS Proof G74-100 Remediation Blueprint Note
This document outlines the blueprint for closing the proof gap for Amendment 41, specifically concerning the MarketingOS G74-100 proof mechanism. It serves as the SSOT foundation for the remediation build pass.
---
1. Exact Missing Implementation or Proof Gap
The core gap is the lack of a verifiable, production-ready apiEP within MarketingOS that securely exposes the G74-100 proof data for a given campaign, along with its corresponding integration test suite. While the underlying G74-100 data may exist internally, its externalization via a dedicated, auditable endpoint for verification purposes is not fully implemented or proven.
2. Smallest Safe Build Slice to Close It
Implement a new, read-only GET endpoint `/marketingos/proof/g74-100` that accepts a `campaignId` query parameter. This endpoint will retrieve the relevant G74-100 proof data from existing MarketingOS internal services (e.g., `CampaignMetricsService`) and return it in a standardized JSON format. Concurrently, develop a dedicated integration test suite to validate the endpoint's functionality, data accuracy, and security posture.
3. Exact Safe-Scope Files to Touch First
-   `src/routes/marketingosRoutes.js`: Add a new GET route definition for `/proof/g74-100`.
-   `src/controllers/marketingosController.js`: Implement a new `getG74_100Proof` function to handle the request, orchestrate data retrieval, and format the response.
-   `src/services/campaignMetricsService.js`: (If not already present) Add or extend a method, e.g., `getG74_100ProofData(campaignId)`, to fetch the specific G74-100 data. This service should leverage existing data access layers.
-   `src/tests/integration/marketingosProofG74_100.test.js`: Create a new test file containing integration tests for the `/marketingos/proof/g74-100` endpoint.
4. Verifier/Runtime Checks
1.  API Call Verification:
-   Execute `GET /marketingos/proof/g74-100?campaignId=VALID_CAMPAIGN_ID` with a known valid `campaignId`.
-   Assert HTTP status code is `200 OK`.
-   Assert response body is a JSON object containing expected G74-100 data structure (e.g., `{ "campaignId": "VALID_CAMPAIGN_ID", "g74_100_status": "verified", "timestamp": "..." }`).
-   Execute `GET /marketingos/proof/g74-100?campaignId=INVALID_CAMPAIGN_ID`.
-   Assert HTTP status code is `404 Not Found` or `400 Bad Request` (depending on errHdl strategy for invalid IDs).
-   Execute `GET /marketingos/proof/g74-100` (without `