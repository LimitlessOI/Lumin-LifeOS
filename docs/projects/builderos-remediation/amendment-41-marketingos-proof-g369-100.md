<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 MarketingOS SSOT Foundation (G369-100) -->

# Proof-Closing Blueprint Note: Amendment 41 MarketingOS SSOT Foundation (G369-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

This blueprint note addresses the follow-through required to close the proof gap for Amendment 41, establishing the MarketingOS Single Source of Truth (SSOT) foundation.

### 1. Exact Missing Implementation or Proof Gap

The exact missing implementation and proof gap is the concrete, verifiable implementation of the MarketingOS Single Source of Truth (SSOT) for campaign states, as designed in `AMENDMENT_41_MARKETINGOS.md`. This includes the mechanism to aggregate, store, and expose the canonical campaign state, and the operational proof that this mechanism is functioning correctly and consistently across relevant systems. The current state lacks a demonstrable, testable endpoint and service logic that confirms the SSOT's existence and accuracy.

### 2. Smallest Safe Build Slice to Close It

Implement a minimal `MarketingSsotService` responsible for receiving and storing canonical campaign state updates. This service will expose a read-only internal method (and corresponding API endpoint) to retrieve the current SSOT state for a given `campaignId`. This slice focuses on establishing the core SSOT data persistence and a basic, verifiable retrieval mechanism, without altering existing MarketingOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing-ssot.service.js`: New module for core SSOT state management logic (e.g., `getCampaignState`, `updateCampaignState`).
*   `src/controllers/marketing-ssot.controller.js`: New controller to handle requests for SSOT campaign states, interacting with `MarketingSsotService`.
*   `src/routes/marketing-ssot.routes.js`: New route definition for a read-only API endpoint (e.g., `GET /api/v1/marketing-ssot/campaign/:campaignId`).
*   `src/tests/unit/marketing-ssot.service.test.js`: Unit tests for `MarketingSsotService` to verify state aggregation and retrieval.
*   `src/tests/integration/marketing-ssot.api.test.js`: Integration tests for the new SSOT API endpoint to verify correct data exposure.

### 4. Verifier/Runtime Checks

*   **Unit Test Pass:** All tests in `src/tests/unit/marketing-ssot.service.test.js` must pass, confirming the internal logic for state management.
*   **Integration Test Pass:** All tests in `src/tests/integration/marketing-ssot.api.test.js` must pass, confirming the API endpoint correctly serves the SSOT state.
*   **Manual API Verification:** A `GET /api/