Proof-Closing Blueprint Note: AMENDMENT_41_MARKETINGOS - Proof G40-100
This document addresses the proof gap G40-100 identified within AMENDMENT_41_MARKETINGOS, focusing on the reliable transmission and verification of the `user_onboarded_successfully` event to MarketingOS. This event is critical for triggering initial user engagement campaigns and accurate audience segmentation.
1. Exact Missing Implementation or Proof Gap
The current implementation lacks a verified, production-ready mechanism to reliably emit the `user_onboarded_successfully` event from the LifeOS platform to the designated MarketingOS endpoint, ensuring data integrity and receipt confirmation. Specifically, the proof gap is the absence of a dedicated, testable, and observable event forwarding function for this specific event, integrated into the user onboarding completion flow.
2. Smallest Safe Build Slice to Close It
Implement a new `sendUserOnboardedEvent` function within the `services/marketing/marketingEventService.js` module. This function will encapsulate the logic for constructing the `user_onboarded_successfully` event payload and dispatching it to the MarketingOS API. The function will include basic errHdl and logging for dispatch failures. Integration will occur at the point where user onboarding is confirmed as complete.
3. Exact Safe-Scope Files to Touch First
-   `services/marketing/marketingEventService.js` (new file, or extend if exists)
-   `services/onboarding/onboardingCompletionService.js` (existing file, to call the new marketing event function)
4. Verifier/Runtime Checks
-   **Unit Test:** `services/marketing/marketingEventService.test.js` to verify `sendUserOnboardedEvent` correctly formats and attempts to dispatch the event payload. Mock MarketingOS API calls to confirm payload structure and error handling.
-   **Integration Test:** Simulate a full user onboarding flow, asserting that `sendUserOnboardedEvent` is invoked and a corresponding event is logged or observed in a test MarketingOS endpoint (if available in staging).
-   **Observability:** Monitor `marketingEventService` logs for successful dispatches and any `errHdl` activations. Verify MarketingOS receives the `user_onboarded_successfully` event with correct `userId` and `timestamp` via MarketingOS internal dashboards or API.
5. Stop Conditions if Runtime Truth Disagrees
-   If unit tests for `sendUserOnboardedEvent` fail, indicating incorrect payload construction or dispatch logic.
-   If integration tests fail to show the event being triggered or dispatched during a simulated onboarding.
-   If production monitoring reveals a significant discrepancy between successful user onboardings and `user_onboarded_successfully` events received by MarketingOS (e.g., >1% divergence over a 24-hour period).
-   If MarketingOS reports malformed events or unexpected data from LifeOS for this event type.