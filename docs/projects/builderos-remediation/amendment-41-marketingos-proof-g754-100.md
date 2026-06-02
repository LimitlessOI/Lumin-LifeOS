The specification is contradictory: The task explicitly asks to write a markdown file (`docs/projects/builderos-remediation/amendment-41-marketingos-proof-g754-100.md`) with provided content, but the OIL verifier rejected the previous attempt because it tried to execute the `.md` file as JavaScript, and the prompt also includes a general instruction to "Generate the complete implementation code. Output ONLY the code first". This creates a conflict between producing the specified markdown content and satisfying the verifier's implicit expectation for executable JavaScript. Grounding in the explicit task and provided file content, the markdown content is produced.

AMENDMENT 41: MarketingOS Proof - G754-100 Campaign Performance Summary
This document serves as a proof-closing blueprint note for Amendment 41, focusing on the implementation and verification of the `campaignPerformanceSummary` exposure for the `g754-100` campaign identifier within MarketingOS. This note directly addresses the SSOT foundation provided by `docs/projects/AMENDMENT_41_MARKETINGOS.md`.
---
1. Exact Missing Implementation or Proof Gap
The core gap is the absence of a verified, production-ready implementation that exposes the `campaignPerformanceSummary` data structure for the `g754-100` campaign identifier through an existing MarketingOS apiEP. This includes the data retrieval logic, apiEP integration, and comprehensive runtime validation.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
a.  Implementing a new function within an existing MarketingOS data service to fetch `campaignPerformanceSummary` specifically for `g754-100`.
b.  Extending an existing MarketingOS API route handler to expose this data via a new or modified endpoint.
c.  Adding basic schema validation for the returned data.
3. Exact Safe-Scope Files to Touch First
-   `src/services/marketing/campaignPerformanceService.js`: (New or existing, if new, ensure it follows existing service patterns) Add or modify a function, e.g., `getG754CampaignPerformanceSummary()`, responsible for fetching the specific performance data.
-   `src/routes/marketing/campaignRoutes.js`: (Existing) Add a new GET route, e.g., `/api/marketing/campaigns/g754-100/performance`, or extend an existing one to call the new service function and return the data.
-   `src/schemas/marketing/campaignPerformanceSchema.js`: (New or existing) Define or extend a Joi/Zod schema for `campaignPerformanceSummary` to ensure data integrity.
4. Verifier/Runtime Checks
-   API Endpoint Test:
-   `GET /api/marketing/campaigns/g754-100/performance`
-   Expected HTTP Status: `200 OK`
-   Expected Response Body: JSON object containing `campaignPerformanceSummary` with fields like `impressions`, `clicks`, ``conversions`, `spend`, `roi`, `dateRange`, etc., matching the defined schema.
-   Data Integrity Check:
-   Verify that `campaignPerformanceSummary` contains non-null, valid numerical values for key metrics (e.g., `impressions > 0`, `clicks >= 0`).
-   Verify `dateRange` is correctly formatted and reflects the intended reporting period.
-   Verify the structure conforms to `src/schemas/marketing/campaignPerformanceSchema.js`.
-   Error Handling Test:
-   Simulate a scenario where `g754-100` data is unavailable (e.g., temporary DB outage).
-   Expected HTTP Status: `500 Internal Server Error` or `404 Not Found` (if data genuinely doesn't exist for the identifier).
-   Expected Response Body: Standardized error payload.
5. Stop Conditions if Runtime Truth Disagrees
-   The `GET /api/marketing/campaigns/g754-100/performance` endpoint returns a `404 Not Found` or `500 Internal Server Error` when data is expected to be present