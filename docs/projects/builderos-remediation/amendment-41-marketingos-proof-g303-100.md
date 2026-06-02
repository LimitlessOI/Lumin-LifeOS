Proof-Closing Blueprint Note: MarketingOS Proof G303-100 Remediation
This document serves as the SSOT foundation for closing the proof gap identified as G303-100 within Amendment 41 for MarketingOS integration.
1. Exact Missing Implementation or Proof Gap
The current implementation lacks explicit, verifiable proof that user consent data, specifically related to `marketingOptInStatus`, is successfully transmitted from LifeOS to MarketingOS via the `MarketingOSConsentUpdate` service. While the integration path exists, a dedicated, observable verification point for G303-100 is absent, making runtime truth difficult to ascertain without deep log diving or direct MarketingOS system access.
2. Smallest Safe Build Slice to Close It
Introduce a dedicated, high-fidelity logging statement within the `MarketingOSConsentUpdate` service upon successful (or failed) transmission of `marketingOptInStatus` for a user. This log entry will include the user ID, the `marketingOptInStatus` value, and the timestamp of the transmission attempt/success. Additionally, a new integration test will be added to simulate this flow and assert the presence of the expected log entry.
3. Exact Safe-Scope Files to Touch First
-   `services/marketing/MarketingOSConsentUpdate.js`: Add logging.
-   `tests/integration/marketing/MarketingOSConsentUpdate.test.js`: Add new test case.
4. Verifier/Runtime Checks
-   Log Monitoring: After a user's `marketingOptInStatus` changes, monitor LifeOS application logs for the specific log entry indicating successful transmission to MarketingOS. The log message should be easily searchable (e.g., `[MarketingOSConsentUpdate] User [userId] marketingOptInStatus [status] transmitted successfully.`).
-   Integration Test Execution: Run the new integration test (`MarketingOSConsentUpdate.test.js`). The test should pass, confirming the logging mechanism is triggered as expected.
-   MarketingOS API/UI Check (Manual/External): For initial verification, confirm in the MarketingOS system (if accessible) that the `marketingOptInStatus` for the test user reflects the transmitted value.
5. Stop Conditions if Runtime Truth Disagrees
-   Missing Log Entries: If the expected log entries are not generated upon `marketingOptInStatus` changes, or if they indicate transmission failures.
-   Integration Test Failure: If the newly added integration test fails to assert the presence of the log entry or indicates an error in the transmission path.
-   MarketingOS Data Mismatch: If manual verification in MarketingOS shows that the `marketingOptInStatus` for the test user does not match the value transmitted from LifeOS, indicating a data synchronization failure despite successful logging.
-   Performance Degradation: If the added logging or test infrastructure introduces measurable performance degradation to the `MarketingOSConsentUpdate` service.