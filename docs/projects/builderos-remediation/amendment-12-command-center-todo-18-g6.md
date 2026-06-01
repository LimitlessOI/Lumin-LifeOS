# BuilderOS Remediation: Amendment 12 Command Center - TODO 18 G6 - C&C Stability for Site Builder UI

This memo addresses the blocking task: "Site Builder UI not built — waiting on C&C stability." The objective is to define and achieve a minimal viable stability state for the Command & Control (C&C) platform to unblock Site Builder UI development.

## 1. Blocking Ambiguity / Founder Decision List

*   **Definition of "C&C Stability":** Specific metrics and thresholds for core C&C services required by Site Builder UI.
    *   *Decision Required:* Which C&C API endpoints are absolutely critical for initial Site Builder UI functionality? (e.g., `GET /sites/{id}`, `POST /sites`, `GET /components`).
    *   *Decision Required:* What are the acceptable latency (e.g., <200ms P95) and error rate (e.g., <0.5% 5xx) thresholds for these critical endpoints?
*   **Scope of "Minimal Viable Stability":** Confirm that this phase focuses solely on *observing* and *reporting* C&C stability, not on implementing C&C fixes or enhancements.

## 2. Already-Settled Constraints

*   **BuilderOS-only Execution:** All changes must be within the BuilderOS governed loop.
*   **No LifeOS/TSOS Impact:** No modifications to existing LifeOS user features or TSOS customer-facing surfaces.
*   **Blueprint Adherence:** The solution must not violate the broader `AMENDMENT_12_COMMAND_CENTER.md` blueprint.
*   **Unblock Site Builder UI:** The primary goal is to provide sufficient C&C stability assurance for the Site Builder UI team to proceed.

## 3. Smallest Buildable Next Slice

Implement a dedicated C&C stability monitoring and reporting service within BuilderOS.
*   **Core C&C API Health Checks:** Periodically ping identified critical C&C API endpoints (e.g., `/health`, `/status`, or specific data endpoints).
*   **Metric Collection:** Collect latency and error rates for these pings.
*   **Stability Aggregation:** Aggregate these metrics into a simple `isCncStable: boolean` status.
*   **Internal Endpoint:** Expose this `isCncStable` status via a new internal BuilderOS API endpoint (e.g., `/builder-os/v1/cnc-stability`).

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `services/builder-os/src/cncStabilityMonitor.js`: New module for C&C API health checks and metric collection.
*   `services/builder-os/src/routes/cncStabilityRoutes.js`: New module defining the internal `/builder-os/v1/cnc-stability` endpoint.
*   `services/builder-os/src/index.js`: Update to import and register `cncStabilityRoutes`.
*   `docs/internal/builder-os/cnc-stability-definition.md`: New documentation detailing the defined C&C stability criteria and monitoring implementation.

## 5. Required Verifier/Runtime Checks

*   **Endpoint Reachability:** The `/builder-os/v1/cnc-stability` endpoint is accessible and returns a valid JSON response.
*   **Status Accuracy:** The `isCncStable` boolean accurately reflects the aggregated health of critical C&C APIs based on defined thresholds.
*   **No Side Effects:** Existing BuilderOS, LifeOS, or TSOS services show no degradation in performance or functionality.
*   **Logging:** Comprehensive logging for C&C health check failures and status changes.

## 6. Stop Conditions

*   **Consistent Stability:** The `/builder-os/v1/cnc-stability` endpoint reports `isCncStable: true` consistently for a minimum of 48 hours.
*   **Site Builder UI Team Sign-off:** The Site Builder UI development team confirms that the reported C&C stability is sufficient for them to proceed with their work.
*   **Founder Approval:** Founder sign-off on the defined "minimal viable stability" criteria and the successful achievement of this state.