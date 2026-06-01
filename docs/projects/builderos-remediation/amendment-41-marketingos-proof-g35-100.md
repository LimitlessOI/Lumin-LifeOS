# Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G35-100

This document serves as the SSOT foundation for closing proof gap G35-100 related to AMENDMENT_41_MARKETINGOS.

## 1. Exact Missing Implementation or Proof Gap

The AMENDMENT_41_MARKETINGOS blueprint defines the requirement for `MarketingEvent` objects to track and expose a `conversionRate` metric. The current implementation lacks the full lifecycle support for this metric: specifically, the calculation, persistence, and exposure of `MarketingEvent.conversionRate` via the MarketingOS API are not fully verified or implemented.

**Proof Gap G35-100:** Verification that the `conversionRate` metric for `MarketingEvent` objects, as defined in AMENDMENT_41_MARKETINGOS, is correctly calculated, persisted, and exposed via the MarketingOS API.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves extending existing `MarketingEvent` data structures and logic to incorporate the `conversionRate` metric. This includes:

1.  **Schema Extension:** Add `conversionRate` field to the `MarketingEvent` data model/schema.
2.  **Calculation & Persistence Logic:** Implement or extend the service layer logic responsible for creating/updating `MarketingEvent` instances to calculate `conversionRate` based on relevant event data (e.g., `impressions`, `clicks`, `conversions`) and persist it.
3.  **API Exposure:** Ensure the `conversionRate` field is included in the response payload of relevant MarketingOS API endpoints that retrieve `MarketingEvent` data (e.g., `GET /api/v1/marketing-events/:id`, `GET /api/v1/marketing-events`).

## 3. Exact Safe-Scope Files to Touch First

The following files are within safe scope and should be touched first to implement the build slice:

*   `src/modules/marketing/marketingEvent.model.js`: To add the `conversionRate` field definition to the `MarketingEvent` schema.
*   `src/modules/marketing/marketingEvent.service.js`: To implement the `conversionRate` calculation logic during event creation or update, and ensure its persistence.
*   `src/modules/marketing/marketingEvent.controller.js`: To ensure the `conversionRate` field is included in the API response transformation for `MarketingEvent` retrieval endpoints.
*   `tests/integration/marketingEvent.integration.test.js`: To add new integration tests verifying the presence and correctness of `conversionRate` in API responses.

## 4. Verifier/Runtime Checks

To verify the implementation and close the proof gap:

*   **API Call Verification:**
    *   Execute `GET /api/v1/marketing-events/:id` for a known `MarketingEvent` that should have a calculated `conversionRate`.
    *   Assert that the response body contains a `conversionRate` field with a numeric value.
    *