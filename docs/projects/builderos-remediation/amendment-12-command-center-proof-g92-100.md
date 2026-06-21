<!-- SYNOPSIS: Amendment 12 Command Center Proof: G92-100 Closing Note -->

# Amendment 12 Command Center Proof: G92-100 Closing Note

This document serves as a proof-closing blueprint note for the `g92-100` build slice, and outlines the next smallest, blueprint-backed build slice for the Command Center.

---

## Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The Command Center's `SystemMetricsDisplay` component currently renders static system metrics. The proof gap is the absence of real-time, streaming updates for these metrics, which is a core requirement for an operational Command Center.

**2. Smallest safe build slice to close it:**
Implement a WebSocket-based real-time data stream for system metrics, integrating it into the Command Center UI to provide dynamic updates. This slice focuses solely on the data pipeline and UI consumption for metrics, without introducing new metric types or complex visualizations.

**3. Exact safe-scope files to touch first:**
*   `apps/command-center/src/components/SystemMetricsDisplay.jsx`: Modify to consume and render data from a WebSocket stream instead of static props/initial fetch.
*   `apps/command-center/src/services/metricsService.js`: Create a new service responsible for establishing and managing the WebSocket connection, subscribing to metric updates, and providing them to UI components.
*   `packages/api-gateway/src/routes/ws/metrics.js`: Define a new WebSocket route handler to expose real-time system metrics. This handler will push data from the underlying metrics source (e.g., a system monitoring agent or internal bus).
*   `packages/api-gateway/src/server.js`: Integrate the new WebSocket route into the API Gateway's server configuration.

**4. Verifier/runtime checks:**
*   Navigate to the Command Center UI and observe the `SystemMetricsDisplay` component. Verify that the displayed metrics (e.g., CPU, memory, network I/O) update dynamically without requiring a page refresh.
*   Open browser developer tools (Network tab) and confirm an active WebSocket connection to `/ws/metrics` is established and continuously receiving data.
*   Inspect console logs for any errors related to WebSocket connection, data parsing, or UI rendering.
*   Simulate system load changes (if possible in a dev environment) and observe corresponding metric updates in the UI.

**5. Stop conditions if runtime truth disagrees:**
*   Metrics in the `SystemMetricsDisplay` component remain static or only update upon manual page refresh.
*   The WebSocket connection fails to establish, drops frequently, or reports errors in the browser console or server logs.
*   Data received via the WebSocket is malformed, incomplete, or cannot be parsed correctly by the client-side `metricsService` or `SystemMetricsDisplay`.
*   Significant performance degradation (e.g., high CPU usage, UI jank) is observed in the Command Center UI due to the real-time updates, indicating inefficient rendering or data processing.