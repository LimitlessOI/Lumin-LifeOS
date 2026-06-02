AMENDMENT 41: MarketingOS Proof - G359-100 Blueprint Note
Signal: This document — SSOT foundation.
1. Exact Missing Implementation or Proof Gap
The core gap is the lack of a verified, production-ready data pipeline for critical user lifecycle events and attributes from LifeOS to MarketingOS, specifically for proving user segmentation capabilities. The current state lacks a concrete mechanism to confirm that LifeOS user data (e.g., `*uid`, `signup_date`, `last_login`) is accurately and reliably transmitted to, and consumable by, MarketingOS for its intended purpose (e.g., audience segmentation, campaign triggering).
2. Smallest Safe Build Slice to Close It
Implement an asynchronous, event-driven data synchronization mechanism for new user registrations and key user profile updates from LifeOS to MarketingOS. This slice will focus on pushing `*uid` and `signup_date` upon user creation, and `last_login` upon subsequent logins. The goal is to establish a foundational, verifiable data flow without impacting core LifeOS user experience.
3. Exact Safe-Scope Files to Touch First
-   `src/services/userService.js`: Extend user creation/update logic to emit events.
-   `src/events/userEvents.js`: Define new events like `USER_CREATED`, `USER_LOGGED_IN`.
-   `src/subscribers/marketingOSSubscriber.js`: (New file) A new event subscriber to listen for `USER_CREATED` and `USER_LOGGED_IN` events and trigger data push to MarketingOS.
-   `src/integrations/marketingOSClient.js`: (New file) A dedicated client for interacting with the MarketingOS API, handling auth and data formatting.
-   `src/config/integrations.js`: Add MarketingOS apiEP and credentials configuration.
-   `src/app.js` or `src/server.js`: Ensure `marketingOSSubscriber.js` is initialized and registered with the event system.
4. Verifier/Runtime Checks
-   Unit Tests (`marketingOSClient.js`): Verify correct apiEP construction, payload formatting, and errHdl for MarketingOS API calls.
-   Integration Tests (`marketingOSSubscriber.js`): Simulate `USER_CREATED` and `USER_LOGGED_IN` events and assert that `marketingOSClient.js.sendUserData` is called with the expected `*uid`, `signup_date`, and `last_login` payloads. Mock MarketingOS API responses to ensure subscriber resilience.
-   Runtime Check (Staging/Production):
    1.  Create a new user via LifeOS UI/API.
    2.  Log in as an existing user.
    3.  Within 5 minutes, verify via MarketingOS's administrative interface or API that:
-   The new user's profile exists with correct `*uid` and `signup_date`.
-   The existing user's `last_login` attribute is updated.
    4.  Monitor LifeOS logs for any errors from `marketingOSClient.js` or `marketingOSSubscriber.js`.
    5.  Monitor MarketingOS API logs for successful data ingestion.
5. Stop Conditions if Runtime Truth Disagrees
-   If MarketingOS does not reflect new user data or updated `last_login` within 5 minutes of the corresponding LifeOS event, consistently across multiple tests.
-   If the data received by MarketingOS is consistently malformed, incomplete, or incorrectly mapped to MarketingOS attributes.
-   If `marketingOSClient.js` or `marketingOSSubscriber.js` logs show a sustained error rate above 0.1% for data push operations.
-   If the integration introduces measurable latency (e.g., >50ms) to core LifeOS user creation or login flows.
-   If MarketingOS API consistently returns non-2xx status codes for data ingestion requests.