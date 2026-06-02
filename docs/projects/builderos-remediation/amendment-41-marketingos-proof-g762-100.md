# Amendment 41 MarketingOS Proof - G762-100

## Proof-Closing Blueprint Note

This document serves as a proof-closing blueprint note for a specific implementation gap identified from `docs/projects/AMENDMENT_41_MARKETINGOS.md`. The goal is to provide a clear, actionable plan for the next C2 build pass to close this gap.

---

### 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint specifies the requirement for a new internal API endpoint to allow MarketingOS to query user segment data. Specifically, the `POST /api/v1/marketingos/segments/query` endpoint, which accepts a list of `userIds` and returns their associated marketing segments, is not yet implemented. This endpoint is critical for enabling MarketingOS to personalize user experiences based on real-time segment data.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the `POST /api/v1/marketingos/segments/query` endpoint. This includes:
*   Defining the new route within the existing API structure.
*   Creating a controller function to handle the request, including input validation for `userIds`.
*   Developing a service layer function to efficiently retrieve segment data for the given `userIds` from the LifeOS data store.
*   Ensuring the response adheres to the specified schema: `[{ userId: string, segments: string[] }]`.
*   Implementing robust error handling for invalid inputs or data retrieval issues.

### 3. Exact Safe-Scope Files to Touch First

Based on existing LifeOS Node/ESM patterns, the following files are the primary safe-scope touch points:

*   `src/routes/marketingos.js` (New file, or extend `src/routes/index.js` if MarketingOS routes are consolidated there)
*   `src/controllers/marketingosController.js` (New file)
*   `src/services/marketingosService.js` (New file, or extend `src/services/userService.js` if segment logic is tightly coupled with user data)
*   `src/validators/marketingosValidator.js` (New file for request body validation, if a dedicated validator module is preferred)

### 4. Verifier/Runtime Checks

To verify the successful implementation and closure of this gap, the following runtime checks should be performed:

*   **Positive Case:** Send a `POST` request to `/api/v1/marketingos/segments/query` with a JSON body containing `{"userIds": ["user-id-1", "user-id-2"]}` where `user-id-1` and `user-id-2` are valid, existing user IDs with known segment data.
    *   **Expected Outcome:** HTTP 200 OK response with a JSON array like `[{"userId": "user-id-1", "segments": ["segmentA", "segmentB"]}, {"userId": "user-id-2", "segments": ["segmentC"]}]`.
*   **Empty User IDs:** Send a `POST` request with `{"userIds": []}`.
    *   **Expected Outcome:** HTTP 200 OK response with an empty JSON array `[]`.
*   **Non-existent User IDs:** Send a `POST` request with `{"userIds": ["non-existent-id"]}`.
    *   **Expected Outcome:** HTTP 200 OK response with `[{"userId": "non-existent-id", "segments": []}]` or an empty array if the service filters out non-existent users. The former is preferred for explicit mapping.
*