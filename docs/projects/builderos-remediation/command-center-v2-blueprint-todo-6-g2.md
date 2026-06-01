BuilderOS Remediation: Command Center V2 Blueprint - Aggregate Summary Endpoint

Reason this blueprint is not yet directly buildable: The blueprint task "Add aggregate summary endpoint" remains open with critical ambiguities regarding data sources, aggregation logic, and specific API contract.

---

This memo outlines a builder-ready enhancement for the "Add aggregate summary endpoint" task, focusing on the smallest buildable slice to unblock progress.

1.  **Blocking Ambiguity or Founder Decision List**
    *   **Data Sources for Aggregation:** What specific internal systems, services, or database tables should contribute data to the aggregate summary? (e.g., `lifeos_user_activity`, `tsos_order_metrics`, `system_health_logs`).
    *   **Specific Metrics/Fields:** What exact data points are required in the summary? (e.g., `active_users_24h`, `total_orders_today`, `system_uptime_minutes`, `error_rate_5min`).
    *   **Aggregation Logic:** For each metric, what is the precise aggregation method and time window? (e.g., `SUM(users.login_count) WHERE last_24h`, `AVG(response_time) WHERE last_5min`).
    *   **API Contract:** Define the exact endpoint path, required query parameters (if any), and the full JSON response structure.
    *   **Authorization Model:** What specific roles or permissions are required to access this endpoint?

2.  **Already-Settled Constraints**
    *   Execution is governed by BuilderOS-only loops.
    *   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    *   Implementation must strictly adhere to approved builder safe scope.
    *   Code must follow existing Node/ESM patterns and extend, not rebuild, existing infrastructure.
    *   The endpoint is for internal Command Center V2 use, implying internal tooling context.

3.  **Smallest Buildable Next Slice**
    Implement a minimal, placeholder aggregate summary endpoint focused on a single, simple metric (e.g., system health status or uptime). This slice will establish the routing, basic service structure, and a mock response, providing a concrete foundation for future expansion once ambiguities are resolved.

    *   **Endpoint:** `GET /api/v2/command-center/summary/health`
    *   **Mock Response:** `{"status": "ok", "uptime_minutes": 123, "last_checked_at": "2024-07-20T10:00:00Z"}`
    *   **Purpose:** Validate routing, basic service integration, and API contract definition.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `src/routes/commandCenterV2Routes.js`: New file to define Command Center V2 specific API routes.
    *   `src/services/commandCenterV2Service.js`: New file for business logic related to Command Center V2, initially returning mock data.
    *   `src/app.js` or `src/server.js`: Modify to import and register `commandCenterV2Routes.js`.
    *   `docs/api/commandCenterV2Summary.md`: New API documentation file for the `/api/v2/command-center/summary/health` endpoint.

5.  **Required Verifier/Runtime Checks**
    *   **Endpoint Accessibility:** Verify `GET /api/v2/command-center/summary/health` returns a 200 OK status.
    *   **Response Structure:** Validate the response body matches the mock structure: `{"status": string, "uptime_minutes": number, "last_checked_at": string}`.
    *   **No Regressions:** Confirm no existing LifeOS or TSOS endpoints are affected.
    *   **Pattern Adherence:** Automated linting and style checks for new files.

6.  **Stop Conditions**
    *   A functional `GET /api/v2/command-center/summary/health` endpoint is deployed and accessible.
    *   The endpoint returns the specified mock aggregate summary data.
    *   All new and modified files adhere to existing code patterns and conventions.
    *   All verifier/runtime checks pass successfully.
    *   The listed blocking ambiguities are clearly presented for founder review.