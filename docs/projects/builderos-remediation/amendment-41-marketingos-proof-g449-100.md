Proof-Closing Blueprint Note: Amendment 41 - MarketingOS SSOT Foundation (G449-100)
1. Exact Missing Implementation or Proof Gap:
The precise gap is the lack of concrete implementation and verified data flow demonstrating that MarketingOS successfully consumes and utilizes customer segment data from the designated `CustomerSegmentsService` as the Single Source of Truth (SSOT), as outlined in Amendment 41. Specifically, proof is missing for:
-   The existence of a dedicated adapter within MarketingOS for `CustomerSegmentsService`.
-   The successful establishment of a data pipeline from `CustomerSegmentsService` into MarketingOS.
-   The ability of MarketingOS to retrieve and parse customer segment data from this SSOT.
2. Smallest Safe Build Slice to Close It:
Implement a minimal `CustomerSegmentsAdapter` within MarketingOS that can connect to and fetch a single customer segment by ID from the `CustomerSegmentsService`. This slice will also include a new internal apiEP in MarketingOS to expose this adapter's functionality for verification, without impacting any existing customer-facing features.
3. Exact Safe-Scope Files to Touch First:
-   `services/marketingos/src/adapters/CustomerSegmentsAdapter.js` (New file: Implements the adapter logic for `CustomerSegmentsService`).
-   `services/marketingos/src/api/internal/routes/customerSegments.js` (New file: Defines a new internal GET route `/internal/segments/:id` to expose the adapter).
-   `services/marketingos/src/api/internal/index.js` (Modify: Import and register the new `customerSegments` internal route).
-   `services/marketingos/src/config/env.js` (Modify: Add `CUSTOMER_SEGMENTS_SERVICE_URL` envVar definition).
4. Verifier/Runtime Checks:
-   Unit Tests:
-   `services/marketingos/src/adapters/CustomerSegmentsAdapter.test.js`: Verify `CustomerSegmentsAdapter` can construct requests, handle responses, and parse segment data (using mocks for `CustomerSegmentsService`).
-   Integration Tests:
-   `services/marketingos/src/api/internal/routes/customerSegments.test.js`: Test the new internal endpoint `/internal/segments/:id` to ensure it correctly invokes the adapter and returns a structured segment response (using mocks for `CustomerSegmentsService`).
-   Manual Verification (Dev/Staging):
-   Deploy the build slice to a staging environment.
-   Make a direct HTTP GET request to `http://localhost:PORT/internal/segments/test-segment-id` (or equivalent staging URL).
-   Verify the response is a 200 OK with a JSON body representing a customer segment, confirming the data flow from the (mocked or test) `CustomerSegmentsService` through the adapter and internal API.
-   Monitor MarketingOS service logs for any errors or warnings related to the new adapter or route.
5. Stop Conditions if Runtime Truth Disagrees:
-   If the internal endpoint `/internal/segments/:id` returns a 4xx or 5xx HTTP status code, indicating a failure in the adapter or route.
-   If the JSON response from the internal endpoint does not conform to the expected `CustomerSegment` schema (e.g., missing `id`, `name`, `criteria` fields).
-   If MarketingOS service logs show repeated connection failures, auth errors, or data parsing exceptions originating from `CustomerSegmentsAdapter.js`.
-   If the latency for a simple fetch via `/internal/segments/:id` exceeds 500ms consistently, indicating a performance bottleneck in the integration.
-   If any existing MarketingOS features exhibit unexpected behavior or errors after the deployment of this slice, suggesting an unintended side effect or dependency conflict.