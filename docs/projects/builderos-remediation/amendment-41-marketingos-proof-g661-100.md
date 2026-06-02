### AMENDMENT 41: MarketingOS Proof - G661-100

This document serves as a proof-closing blueprint note for Amendment 41, focusing on the MarketingOS integration proof point G661-100.

#### 1. Exact Missing Implementation or Proof Gap

The core proof gap is the verifiable end-to-end transmission and processing of `UserEngagementEvent` data from the LifeOS platform to MarketingOS. Specifically, confirming that the `marketingos-integration-service` correctly consumes these events from the LifeOS event bus, transforms them as per Amendment 41 specifications, and successfully dispatches them to the designated MarketingOS API endpoint. The current gap is the lack of a definitive, automated runtime verification of this data flow beyond unit tests.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves instrumenting the `marketingos-integration-service` to emit specific, verifiable logs upon successful receipt, processing, and dispatch of a `UserEngagementEvent`. This instrumentation will be temporary for proofing and removed post-verification. Additionally, a controlled test scenario will be established to trigger a known `UserEngagementEvent` and observe its journey.

#### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos-integration-service/src/index.ts`: To add a temporary logging configuration or a test-specific event listener if not already present.
*   `services/marketingos-integration-service/src/eventHandlers/UserEngagementEventHandler.ts`: To inject temporary logging statements at key processing stages (event received, transformation complete, dispatch initiated, dispatch successful/failed).
*   `services/marketingos-integration-service/src/api/marketingosClient.ts`: To add temporary logging around the actual API call to MarketingOS, capturing request payload and response status.
*   `packages/lifeos-events/src/UserEngagementEvent.ts`: For reference to ensure correct event structure is being tested and logged.

#### 4. Verifier/Runtime Checks

1.  **Deploy `marketingos-integration-service`:** Deploy a version of the `marketingos-integration-service` with the temporary logging instrumentation to a staging or dedicated proofing environment.
2.  **Trigger `UserEngagementEvent`:** Using a controlled LifeOS test client or a direct event publisher, emit a well-formed `UserEngagementEvent` with known data (e.g., `userId: 'test-user-g661'`, `eventType: 'profile_viewed'`).
3.  **Monitor `marketingos-integration-service` logs:** Observe the logs for the following sequence:
    *   `[INFO] UserEngagementEventHandler: Received event for userId: 'test-user-g661', eventType: 'profile_viewed'`
    *   `[INFO] UserEngagementEventHandler: Transformed event payload: { ... }` (verify payload structure)
    *   `[INFO] MarketingOSClient: Dispatching event to MarketingOS API. Payload: { ... }`
    *   `[INFO] MarketingOSClient: MarketingOS API response: Status 200, Body: { ... }`
4.  **Verify in MarketingOS (if accessible):** If direct access to MarketingOS's internal event logs or a test user profile is available, confirm the event `profile_viewed` for `test-user-g661` has been registered.

#### 5. Stop Conditions if Runtime Truth Disagrees

*   **Event Not Received:** If `marketingos-integration-service` logs do not show the `UserEngagementEvent` being received within a reasonable timeframe after triggering.
*   **Transformation Errors:** If logs indicate errors during event transformation or the transformed payload does not match Amendment 41 specifications.
*   **Dispatch Failure:** If `marketingos-integration-service` logs show non-2xx HTTP status codes from the MarketingOS API, or network errors during dispatch.
*   **Data Mismatch:** If the event data observed in MarketingOS (if verifiable) does not accurately reflect the data sent from LifeOS.
*   **Performance Degradation:** If the temporary logging significantly impacts the service's latency or resource utilization beyond acceptable thresholds.