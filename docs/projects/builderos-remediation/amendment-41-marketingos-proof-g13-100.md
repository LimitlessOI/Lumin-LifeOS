Amendment 41: MarketingOS Proof Gap G13-100 - Consent Update Synchronization
Proof-Closing Blueprint Note
This document outlines the plan to close proof gap `g13-100`, focusing on the verified synchronization of user consent updates from LifeOS to MarketingOS. This is a critical SSOT foundation for Amendment 41.
1. Exact Missing Implementation or Proof Gap
The exact gap is the lack of a verified, end-to-end proof that user consent status changes (e.g., opt-in/opt-out for marketing communications) originating within LifeOS are accurately and consistently propagated to and reflected within the MarketingOS platform. Specifically, `g13-100` targets the proof of successful data synchronization for these consent changes, ensuring MarketingOS operates on the most current user preferences.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
1.  Identify LifeOS Consent Event: Pinpoint the existing LifeOS service or event emitter responsible for signaling user consent changes.
2.  Identify MarketingOS Ingestion Point: Confirm the MarketingOS apiEP or webhook designed to receive consent updates.
3.  Controlled Test Scenario: Establish a controlled test environment where a specific user's consent status can be programmatically altered in LifeOS.
4.  Observation & Verification: Implement a mechanism to observe the corresponding update in MarketingOS, either via its API, UI, or internal logs.
5.  Automated E2E Test: Develop a new, isolated end-to-end test that automates steps 3 and 4, asserting the successful synchronization. This test will run within the BuilderOS CI/CD pipeline.
3. Exact Safe-Scope Files to Touch First
-   `services/user-consent/UserConsentService.js`: (Read-only) Identify the method responsible for updating consent and potentially emitting an event.
-   `integrations/marketingos/MarketingOSClient.js`: (Read-only) Verify the method used to send consent updates to MarketingOS.
-   `tests/e2e/marketingos/consentSync.test.js`: (NEW FILE) This will house the new end-to-end test for `g13-100`.
-   `tests/unit/integrations/marketingos/MarketingOSClient.test.js`: (Extend) Add a unit test to mock MarketingOS response for consent updates.
-   `config/test-data/users.js`: (Extend) Add a specific test user profile for consent testing.
4. Verifier/Runtime Checks
-   LifeOS Event Log: Verify that the `UserConsentUpdated` event (or equivalent) is successfully emitted by LifeOS with the correct user ID and new consent status.
-   MarketingOS Ingestion Log: Confirm that MarketingOS's webhook/apiEP receives a payload containing the user ID and updated consent status within an acceptable latency window (e.g., < 500ms).
-   MarketingOS Data Store Query: Programmatically query MarketingOS (via its API or a controlled test interface) to confirm that the specific user's consent status has been updated to match LifeOS's state.
-   Automated Test Pass: The `tests/e2e/marketingos/consentSync.test.js` suite must pass consistently in CI/CD.
5. Stop Conditions if Runtime Truth Disagrees
-   LifeOS Event Failure: The `UserConsentUpdated` event is not emitted, or its payload is malformed.
-   MarketingOS Receipt Failure: MarketingOS's ingestion endpoint does not receive the consent update event, or it returns an error status (e.g., 4xx, 5xx).
-   Data Mismatch: MarketingOS's internal data for the user's consent status does not match the state in LifeOS after the update.
-   Latency Exceeded: The end-to-end synchronization takes longer than the defined SLA (e.g., 1 second).
-   Idempotency Failure: Repeated consent updates for the same user lead to inconsistent states or errors in MarketingOS.
-   Performance Degradation: The act of updating consent in LifeOS or the subsequent synchronization causes measurable performance degradation in either LifeOS or MarketingOS.