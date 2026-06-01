Proof-Closing Blueprint Note: MarketingOS G39-100 SSOT Foundation
This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap related to MarketingOS G39-100.
---
1. Exact missing implementation or proof gap
The current LifeOS platform lacks a dedicated, auditable, and explicitly designated apiEP that serves as the Single Source of Truth (SSOT) for the data relevant to "MarketingOS Proof G39-100". This gap prevents direct programmatic verification that MarketingOS is the authoritative data provider for this specific metric/dataset within the LifeOS ecosystem.

2. Smallest safe build slice to close it
Implement a new read-only apiEP within the LifeOS `marketing` API surface. This endpoint will directly query the MarketingOS external API for the specific G39-100 metric/dataset, cache it for a short duration (e.g., 5 minutes) to reduce external load, and expose it via a standardized JSON response. The endpoint will be `/api/v1/marketing/g39-100-ssot` and will require appropriate BuilderOS internal authentication/authorization, not exposed to LifeOS user features or TSOS customer-facing surfaces.

3. Exact safe-scope files to touch first
- `src/api/marketing/routes/g39-100-ssot.js`: Define the new GET route for `/api/v1/marketing/g39-100-ssot`.
- `src/api/marketing/controllers/g39-100-ssot.js`: Implement the controller logic to fetch data from MarketingOS, apply caching, and format the response.
- `src/services/marketingOS/g39-100-data.js`: Create a utility module for secure, authenticated calls to the external MarketingOS API for G39-100 data.
- `src/config/externalApis.js`: Add or verify the configuration for the MarketingOS API base URL and credentials.
- `src/middleware/builderAuth.js`: Ensure this existing middleware is applied to the new route to restrict access to BuilderOS internal systems.

4. Verifier/runtime checks
- **Unit Tests:** Verify `src/services/marketingOS/g39-100-data.js` correctly handles external API calls, data parsing, and error conditions.
- **Integration Tests:** Execute a GET request to `/api/v1/marketing/g39-100-ssot` with valid BuilderOS credentials and assert the JSON response structure and data integrity against expected MarketingOS outputs.
- **Data Consistency Monitoring:** Implement a scheduled job to periodically call the new endpoint and compare its output against a direct, independently verified query to MarketingOS, flagging discrepancies.
- **Access Control Verification:** Attempt to access the endpoint without BuilderOS authentication to confirm rejection, ensuring no LifeOS user or TSOS customer exposure.

5. Stop conditions if runtime truth disagrees
- **Data Mismatch:** If the data returned by `/api/v1/marketing/g39-100-ssot` consistently deviates from the MarketingOS source by more than a defined tolerance (e.g., >0.01% for numerical values, or structural schema mismatches).
- **Authentication Bypass:** If the endpoint is accessible without proper BuilderOS internal authentication.
- **Performance Degradation:** If the endpoint's response time consistently exceeds 500ms or causes measurable performance impact on other LifeOS services.
- **External API Failure:** If the `src/services/marketingOS/g39-100-data.js` module consistently fails to retrieve data from MarketingOS, indicating a critical upstream issue.
- **Feature Creep:** If the implementation attempts to modify LifeOS user features or TSOS customer-facing surfaces, violating the BuilderOS-only scope.