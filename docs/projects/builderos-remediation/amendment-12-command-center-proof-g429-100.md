# Amendment 12 Command Center Proof: G429-100 - Initial Dashboard Metrics API

This document outlines the proof-closing blueprint note for the initial implementation slice of the BuilderOS Command Center, specifically targeting the foundational API for dashboard metrics as part of Phase 1 (MVP).

---

**1. Exact Missing Implementation or Proof Gap:**

The core gap is the absence of a functional backend API endpoint to serve even basic, hardcoded metrics for the Command Center dashboard. This endpoint is critical for establishing the data layer that the frontend will consume.

**2. Smallest Safe Build Slice to Close It:**

Implement a new Express API route `/api/v1/dashboard/metrics` that returns a static JSON object containing a single, placeholder metric. This establishes the basic API structure and allows for immediate verification of backend connectivity and response format.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/server/index.js`: Integrate the new dashboard routes into the main Express application.
*   `src/server/routes/dashboardRoutes.js`: Create a new file to define and export dashboard-specific API routes.
*   `src/server/controllers/dashboardController.js`: Create a new file to house the logic for handling dashboard metric requests.

**4. Verifier/Runtime Checks:**

*   **Start Server:** Ensure the Node.js server starts without errors.
*   **API Endpoint Test:** Using a tool like `curl` or Postman, make a `GET` request to `http://localhost:<PORT>/api/v1/dashboard/metrics`.
*   **Expected Response:** Verify that the response status code is `200 OK` and the response body is a JSON object similar to `{"active_tasks": 5, "pending_builds": 2}` (or any other simple, hardcoded metrics).

**5. Stop Conditions if Runtime Truth Disagrees:**

*   **Server Startup Failure:** If the Node.js server fails to start due to syntax errors, port conflicts, or missing dependencies.
*   **404 Not Found:** If the `/api/v1/dashboard/metrics` endpoint returns a `404` status, indicating the route was not correctly registered.
*   **500 Internal Server Error:** If the endpoint returns a `500` status, indicating an unhandled error within the controller logic.
*   **Malformed JSON/Incorrect Data:** If the response is not valid JSON, or if it does not contain the expected hardcoded metric keys (e.g., `active_tasks`).