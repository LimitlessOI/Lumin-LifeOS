# Command Center V2 Blueprint Proof: G505-100 Remediation

This document addresses the OIL verifier rejection for the previous BuilderOS change related to Command Center V2, specifically focusing on deriving the next smallest blueprint-backed build slice to close a critical proof gap.

## Blueprint Note: Real-time Command Status Streaming

### 1. Exact Missing Implementation or Proof Gap

The Command Center V2 blueprint mandates real-time, push-based updates for BuilderOS command execution status. The current implementation relies on periodic polling, which introduces latency and does not meet the V2 specification for immediate feedback. The specific gap is the absence of a dedicated WebSocket endpoint and associated service logic to stream command lifecycle events from BuilderOS to the Command Center V2.

### 2. Smallest Safe Build Slice to Close It

Implement the foundational server-side WebSocket endpoint and service layer for streaming status updates for a single, representative BuilderOS command type: `build.deploy`. This slice will establish the core infrastructure for real-time communication without immediately integrating client-side consumption or supporting all command types.

**Scope:**
*   Create a new WebSocket handler for `/ws/v2/builderos/command-status`.
*   Develop a service responsible for subscribing to internal BuilderOS command events and pushing relevant status changes to connected WebSocket clients.
*   Ensure the service can filter events to only `build.deploy` commands for this initial slice.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/command-center/v2/ws/commandStatusStream.js` (New file: WebSocket endpoint handler for command status)
*   `src/services/builderos/commandStreamService.js` (New file: Service to manage command event subscriptions and WebSocket pushes)
*   `src/server.js` (Modification: Register the new WebSocket route)
*   `src/config/featureFlags.js` (Modification: Add a `commandCenterV2WsEnabled` flag, if not present, to gate the new endpoint)

### 4. Verifier/Runtime Checks

*   **Unit Test (`src/services/builderos/commandStreamService.test.js`):** Verify the `commandStreamService` correctly processes mock BuilderOS command events and formats them for WebSocket transmission.
*   **Integration Test:** Write a test that establishes a WebSocket connection to `/ws/v2/builderos/command-status`, triggers a `build.deploy` command (e.g., via a mock BuilderOS API call), and asserts that the expected status updates are received over the WebSocket.
*   **Manual Verification:**
    1.  Start the LifeOS platform with the new changes.
    2.  Open a WebSocket client (e.g., browser dev tools, `wscat`).
    3.  Connect to `ws://localhost:<port>/ws/v2/builderos/command-status`.
    4.  Initiate a `build.deploy` command through BuilderOS.
    5.  Observe the WebSocket client for real-time status messages.
*   **Schema Validation:** Ensure all pushed messages conform to the `CommandStatusV2Schema` defined in the blueprint (assuming such a schema exists).

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Connection Failure:** If clients cannot successfully establish a WebSocket connection to the new endpoint.
*   **Data Inconsistency:** If the streamed command status updates do not accurately reflect the actual state of the `build.deploy` command in BuilderOS.
*   **Performance Degradation:** If the introduction of the WebSocket service significantly impacts the performance or stability of existing BuilderOS or LifeOS services.
*   **Schema Mismatch:** If the format of the streamed messages deviates from the `CommandStatusV2Schema` specified in the blueprint.
*   **Unintended Side Effects:** If existing BuilderOS command execution or logging mechanisms are inadvertently altered or broken.