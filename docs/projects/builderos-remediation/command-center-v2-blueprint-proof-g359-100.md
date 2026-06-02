# Blueprint Proof: Command Center V2 - Core Dashboard Metrics (G359-100)

This document serves as a proof-closing blueprint note for the initial build slice of the Command Center V2, specifically addressing the "Core Dashboard & Basic Monitoring (MVP)" phase outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`.

---

**1. Exact Missing Implementation or Proof Gap:**

The blueprint specifies "Display key LifeOS metrics (user activity, system health)" as a core feature of Phase 1. The immediate gap is the absence of a backend API endpoint to expose even a single, fundamental metric, and the underlying data retrieval logic. This proof focuses on establishing the capability to retrieve and expose a basic "user activity" metric.

**2. Smallest Safe Build Slice to Close It:**

Implement a new read-only backend API endpoint `/api/v2/metrics/user-activity` that returns a count of all users in the system. This slice establishes the pattern for V2 metric endpoints and verifies basic data retrieval from the database.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/api/v2/metrics/userActivity.js` (New file: Defines the Express route handler for user activity metrics.)
*   `src/api/v2/routes.js` (Modify: Integrates the new `userActivity` route into the V2 API router.)
*   `src/db/queries/userQueries.js` (New file: Contains the SQL query to count all users.)

**4. Verifier/Runtime Checks:**

*   **HTTP Request:** `GET /api/v2/metrics/user-activity`
*   **Expected Response:**
    *   HTTP Status: `200 OK`
    *   Content-Type: `application/json`
    *   Body: `{ "totalUsers": <number> }` where `<number>` is a non-negative integer representing the total count of users.
*   **Verification:**
    *   Confirm the endpoint is accessible and returns a 200 status.
    *   Validate the JSON response structure and data type.
    *   Cross-reference the `totalUsers` count with a direct database query (e.g., `SELECT COUNT(*) FROM users;`) to ensure accuracy.
    *   Monitor response latency to ensure it's within acceptable operational limits.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   If the endpoint returns any HTTP status code other than `200 OK`