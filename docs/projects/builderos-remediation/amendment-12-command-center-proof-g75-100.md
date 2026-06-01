# Amendment 12 Command Center Proof: G75-100 - Telemetry Ingestion & Basic Display Proof

This proof-closing blueprint note addresses the next smallest build slice within the G75-100 range, focusing on establishing the end-to-end pipeline for a foundational telemetry type.

---

**Blueprint Note: G75-100 Build Slice - Initial Telemetry Ingestion & Display (System Heartbeat)**

1.  **Exact missing implementation or proof gap:**
    The current state lacks a fully functional end-to-end pipeline for ingesting a specific telemetry event (e.g., `system_heartbeat`) from a LifeOS agent, persisting it in the database, and displaying its status within the Command Center UI. This gap prevents validation of the core telemetry data flow.

2.  **Smallest safe build slice to close it:**
    Implement the `system_heartbeat` telemetry ingestion endpoint, persist the event, and display the latest heartbeat status in a dedicated Command Center dashboard component. This slice proves the basic data flow from agent to UI.

3.  **Exact safe-scope files to touch first:**
    *   `src/api/command-center/telemetry.js`: Add a new POST endpoint `/api/command-center/telemetry/heartbeat` for ingestion.
    *   `src/db/models/TelemetryEvent.js`: Define or extend the `TelemetryEvent` model to store `type`, `agentId`, `timestamp`, and `payload` for heartbeats.
    *   `src/services/telemetryService.js`: Implement `recordHeartbeat` and `getLatestHeartbeat` functions.
    *   `src/ui/command-center/components/HeartbeatStatus.jsx`: Create a new React component to display the latest heartbeat timestamp and status.
    *   `src/ui/command-center/pages/Dashboard.jsx`: Integrate the `HeartbeatStatus` component into the main Command Center dashboard.

4.  **Verifier/runtime checks:**
    *   **Backend Ingestion:** Send a `POST` request to `/api/command-center/telemetry/heartbeat` with a valid `agentId` and `timestamp`. Verify a `200 OK` response.
    *   **Database Persistence:** Directly query the database to confirm the `system_heartbeat` event is recorded in the `TelemetryEvent` table with correct `agentId` and `timestamp`.
    *   **UI Display:** Navigate to the Command Center Dashboard in a browser. Observe the `HeartbeatStatus` component rendering and displaying the timestamp of the latest ingested heartbeat.
    *   **Real-time Update (Simulated):** Send multiple heartbeat requests at different times. Verify the `HeartbeatStatus` component updates dynamically to reflect the most recent event.

5.  **Stop conditions if runtime truth disagrees:**
    *   If the `/api/command-center/telemetry/heartbeat` endpoint returns any status other than `200 OK` or throws an unhandled error.
    *   If the `system_heartbeat`