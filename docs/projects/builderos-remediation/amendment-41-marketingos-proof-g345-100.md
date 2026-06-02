Amendment 41: MarketingOS Proof G345-100 - Proof-Closing Blueprint Note
Signal: This document — SSOT foundation.
---
1. Exact Missing Implementation or Proof Gap
The `marketingOptInStatus` attribute, as managed by LifeOS, lacks a robust, automated, and verifiable mechanism to confirm its status as the Single Source of Truth (SSOT) within MarketingOS. Specifically, there is no dedicated service or job that periodically or reactively compares the `marketingOptInStatus` in LifeOS's user profile with the corresponding `optInStatus` in MarketingOS's contact record, and logs discrepancies. This gap prevents a definitive proof of synchronization and SSOT adherence.
2. Smallest Safe Build Slice to Close It
Implement a new internal verification service and a scheduled job within LifeOS. This service will:
1.  Retrieve a batch of user `marketingOptInStatus` values from LifeOS's db.
2.  Query MarketingOS's API for the corresponding `optInStatus` for these users.
3.  Compare the two values.
4.  Log any discrepancies found, including user ID, LifeOS status, MarketingOS status, and timestamp.
This slice is read-only from both LifeOS and MarketingOS perspectives, ensuring no data modification and minimal risk.
3. Exact Safe-Scope Files to Touch First
-   `src/services/marketingosVerificationService.js` (New file: Contains the core logic for fetching, comparing, and logging.)
-   `src/jobs/verifyMarketingOptInStatusJob.js` (New file: Defines the scheduled job that orchestrates calls to `marketingosVerificationService`.)
-   `src/config/marketingos.js` (New or existing: Configuration for MarketingOS apiEP, auth, and batch sizes for verification.)
-   `src/models/user.js` (Existing: Ensure `marketingOptInStatus` field is correctly defined and accessible for read operations.)
-   `src/app.js` (Existing: To register the new scheduled job.)
4. Verifier/Runtime Checks
1.  Deployment Verification: Confirm `verifyMarketingOptInStatusJob` is deployed and running as scheduled in the target environment.
2.  Log Monitoring: Monitor LifeOS application logs for output from `marketingosVerificationService`. Expect to see "No discrepancies found" or specific discrepancy reports.
3.  Manual Discrepancy Injection: For a small set of test users, manually update `marketingOptInStatus` in LifeOS, then manually update the corresponding `optInStatus` in MarketingOS to a different value. Trigger the verification job (or wait for its next run) and confirm that the service correctly identifies and logs these discrepancies.
4.  Manual Reconciliation Check: After the job runs, manually query MarketingOS for the test users where discrepancies were reported and confirm the reported status.
5.  Performance Impact: Monitor LifeOS and MarketingOS API performance metrics during job execution to ensure no degradation.
5. Stop Conditions if Runtime Truth Disagrees
-   High Discrepancy Rate: If the verification service consistently reports
The provided REPO FILE CONTENTS for the target file was incomplete.