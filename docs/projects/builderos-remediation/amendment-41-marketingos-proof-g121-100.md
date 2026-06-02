# Amendment 41: MarketingOS Proof - G121-100 (SSOT Foundation)

## Proof-Closing Blueprint Note

This document outlines the necessary steps to close the implementation and proof gap identified in Amendment 41, specifically concerning the establishment of a Single Source of Truth (SSOT) foundation for MarketingOS data consumption from LifeOS.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a dedicated, versioned, and validated API endpoint within LifeOS that serves as the SSOT for `UserEngagementMetrics` required by MarketingOS. While Amendment 41 outlines the *need* for this data, the concrete implementation of the LifeOS-side data exposure and its SSOT guarantees are not yet in place. This includes the data serialization format, access control, and initial data validation at the source.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   **LifeOS API Endpoint:** Create a new read-only, authenticated API endpoint within LifeOS under the `/marketingos/v1/` path. This endpoint will expose `UserEngagementMetrics` for a specified time range or user segment.
*   **Data Service Layer:** Implement a new service in LifeOS responsible for aggregating and formatting `UserEngagementMetrics` from existing LifeOS data stores into the agreed-upon SSOT schema.
*   **Schema Definition:** Define and publish the canonical JSON schema for `UserEngagementMetrics` that this endpoint will adhere to.
*   **Basic Access Control:** Implement token-based authentication for MarketingOS to access this endpoint.

This slice focuses solely on the LifeOS side of the SSOT contract, providing the foundational data source without requiring immediate changes to MarketingOS consumption logic beyond initial integration testing.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/marketingos/v1/userEngagementMetrics.js`: New file for the API endpoint handler.
*   `src/routes/marketingos.js`: Add a new route definition pointing to the new handler.
*   `src/services/marketingos/userEngagementService.js`: New file for the data aggregation and formatting logic.
*   `src/schemas/marketingos/userEngagementMetrics.json`: New file defining the JSON schema for the data.
*   `src/middleware/auth/marketingosAuth.js`: Potentially extend or create a new middleware for MarketingOS-specific authentication if not already present.

### 4. Verifier/Runtime Checks

*   **Endpoint Accessibility:** `GET /marketingos/v1/user-engagement-metrics?startDate=...&endDate=...` returns HTTP 200 OK with valid authentication.
*   **Schema Conformance:** The JSON response body strictly adheres to `src/schemas/marketingos/userEngagementMetrics.json`.
*   **Data Integrity:** Returned `userId` values are valid LifeOS user IDs. `timestamp` values are valid ISO 8601 strings. Metric values (e.g., `sessionCount`, `activeTimeMinutes`) are non-negative integers/floats.
*   **Performance:** Endpoint response time is consistently below 200ms for typical query loads.
*   **Error Handling:** Invalid parameters (e.g., missing `startDate`) result in appropriate HTTP 400 responses. Unauthorized access results in HTTP 401.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Schema Mismatch:** The endpoint consistently returns data that does not conform to `src/schemas/marketingos/userEngagementMetrics.json` after initial deployment.
*   **Data Inaccuracy:** Discrepancies are found between the data returned by the endpoint and the underlying LifeOS data sources, indicating a failure in the `userEngagementService.js` aggregation logic.
*   **Authentication Failure:** MarketingOS is unable to consistently authenticate and retrieve data, indicating an issue with the access control implementation.
*   **Performance Degradation:** The new endpoint introduces significant latency or resource contention on LifeOS, impacting other critical services.
*   **Security Vulnerability:** Any identified security flaw in the new endpoint or authentication mechanism.