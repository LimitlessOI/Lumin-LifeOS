### Blueprint Note: Command Center V2 - G9-100 Proof Closing

This note closes the proof for blueprint gate `g9-100`, focusing on establishing the foundational data access layer for core system status within Command Center V2.

1.  **Exact missing implementation or proof gap:**
    The blueprint specifies the need for real-time system status data for Command Center V2. The current gap is the absence of a dedicated, internal-only API endpoint to retrieve the current operational status of a specific system, even in a mock or static form. This foundational data access is required before any UI integration or complex logic can be built.

2.  **Smallest safe build slice to close it:**
    Implement a new, internal-only `/api/v2/command-center/system-status/:systemId` GET endpoint. This endpoint will initially return a hardcoded JSON object representing the status of a predefined system (e.g., `core-service-a`). The response should include `status` (e.g., "operational") and `lastUpdated` (an ISO timestamp). This slice focuses solely on exposing the data, not on its persistence, real-time updates, or UI consumption.

3.  **Exact safe-scope files to touch first:**
    -   `src/api/v2/command-center/systemStatusRoutes.js` (new file: defines the route `/api/v2/command-center/system-status/:systemId`)
    -   `src/api/v2/command-center/systemStatusController.js` (new file: contains the handler logic for the route, returning mock data)
    -   `src/api/v2/index.js` (modification: registers the new `systemStatusRoutes` with the main API router)
    -   `src/config/constants.js` (modification: optionally defines a `DEFAULT_MOCK_SYSTEM_ID` for consistency)

4.  **Verifier/runtime checks:**
    -   Execute `curl -X GET http://localhost:3000/api/v2/command-center/system-status/core-service-a` (assuming `core-service-a` is the mock ID).
    -   Verify the HTTP response status code is `200 OK`.
    -   Verify the response body is a valid JSON object.
    -   Verify the JSON object contains the keys `status` (string) and `lastUpdated` (string).
    -   Verify the `status` value is "operational".
    -   Verify the `lastUpdated` value is a valid ISO 8601 timestamp string.
    -   Confirm no sensitive or unauthorized data is exposed in the response.

5.  **Stop conditions if runtime truth disagrees:**
    -   If the endpoint returns an HTTP status code other than `200` (e.g., `404`, `500`).
    -   If the response body is not valid JSON or does not contain the expected `status` and `lastUpdated` keys.
    -   If the `status` value is not "operational" or `lastUpdated` is not a valid ISO timestamp.
    -   If the endpoint requires any form of authentication or authorization not explicitly defined as part of this initial, internal-only slice.
    -   If the endpoint exposes any data beyond the minimal mock status object.