The task requests a `.md` file, but the OIL verifier attempts to execute it as a Node.js module, leading to an `ERR_UNKNOWN_FILE_EXTENSION`.
AMENDMENT 41: MarketingOS Proof - G71-100: Initial User Profile Synchronization Proof-Closing Blueprint Note

This blueprint note addresses the proof-closing for the initial synchronization of existing LifeOS user profiles to MarketingOS, as outlined in `docs/projects/AMENDMENT_41_MARKETINGOS.md` under the "Data Synchronization" section. This document serves as the SSOT foundation for verifying the successful and complete transfer of user profile data.

### 1. Exact Missing Implementation or Proof Gap

The current state lacks a verifiable mechanism to confirm the successful, complete, and idempotent synchronization of existing LifeOS user profiles to MarketingOS. Specifically, the proof gap is the absence of an automated, auditable check that confirms:
*   All active LifeOS user profiles (as of a specific cut-off) have a corresponding entry in MarketingOS.
*   Key profile attributes (e.g., `userId`, `email`, `creationDate`, `lastLoginDate`, `subscriptionStatus`) are accurately mirrored.
*   The synchronization process handles edge cases (e.g., deleted LifeOS profiles, profiles with missing data) gracefully without introducing inconsistencies.

### 2. Smallest Safe Build Slice to Close It

Implement a BuilderOS-governed verification job (`sync-proof-g71-100-verifier`) that runs post-synchronization. This job will:
*   Query LifeOS for a sample set of active user profiles.
*   Query MarketingOS for the corresponding profiles.
*   Compare key attributes and report discrepancies.
*   Log the verification outcome to BuilderOS audit logs.
This slice focuses purely on *verification* and does not alter the synchronization logic itself.

### 3. Exact Safe-Scope Files to Touch First

*   `builderos/jobs/sync-proof-g71-100-verifier.js`: New Node.js script for the verification logic.
*   `builderos/config/jobs.json`: Add configuration entry for `sync-proof-g71-100-verifier` job, including schedule (e.g., post-sync trigger) and required environment variables (e.g., MarketingOS API endpoint, LifeOS DB connection string).
*   `builderos/schemas/job-config.json`: Potentially update schema if new configuration parameters are needed for this job type (unlikely for a simple verifier).

### 4. Verifier/Runtime Checks

*   **BuilderOS Job Status:** The `sync-proof-g71-100-verifier` job must complete with a `SUCCESS` status in BuilderOS.
*   **Log Output:** Job logs must indicate "Verification Passed: No discrepancies found for sample set" or detail specific discrepancies.
*   **Data Sample