# Amendment 41 MarketingOS Proof - G395-100

This document serves as a proof-closing blueprint note for Amendment 41, focusing on the verification of its integration within MarketingOS, specifically proof point G395-100. This note outlines the exact gap, the minimal build slice to close it, affected files, verification steps, and stop conditions.

## 1. Exact Missing Implementation or Proof Gap

Verification that MarketingOS's `customerProfileSync` service correctly ingests, processes, and reflects the `amendment41ConsentStatus` attribute for customer profiles, as mandated by Amendment 41. Specifically, proof is required that this attribute is present, correctly parsed from incoming data, and accurately stored in the MarketingOS customer data store for subsequent use by MarketingOS features.

## 2. Smallest Safe Build Slice to Close It

Implement a temporary, non-mutating logging and validation hook within the `customerProfileSync` ingestion pipeline. This hook will specifically inspect the `amendment41ConsentStatus` attribute for incoming profiles, logging its presence, type, and value without altering the data flow or customer-facing features. Concurrently, expose a new, internal-only API endpoint to query the real-time status and aggregated results of this validation process. This slice is designed to provide observability and proof without introducing new core features or modifying existing customer data.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/customerProfileSync/ingestionService.js`: Integrate the temporary validation and logging hook within the profile processing logic.
*   `services/marketingos/src/api/internal/proofRoutes.js`: Add a new route for `GET /internal/proof/g395-100/status` to expose validation results.
*   `services/marketingos/src/api/internal/schemas/proofSchemas.js`: Define request/response schemas for the new internal proof endpoint.
*   `services/marketingos/test/internal/proof.test.js`: Implement unit and integration tests for the new internal proof endpoint and the validation logic.
*   `services/marketingos/src/utils/logger.js`: Potentially extend or configure for specific `[AMENDMENT_41_PROOF_G395_100]` log tagging.

## 4. Verifier/Runtime Checks

*   **Internal API Check:** Execute `GET /internal/proof/g395-100/status`. Expect a `200 OK` response with a