# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS EngagedUsers Segment Sync (G828-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal Requiring Follow-Through:** This document — SSOT foundation.

---

This document serves as the proof-closing blueprint note for Amendment 41, focusing on the verifiable synchronization of the `EngagedUsers` segment from LifeOS to MarketingOS. The objective is to establish and prove the end-to-end data flow and segment accuracy as the Single Source of Truth (SSOT) foundation for targeted marketing campaigns.

## 1. Exact Missing Implementation or Proof Gap

The precise gap is the lack of a fully implemented and proven mechanism for LifeOS to:
a. Accurately define and identify users belonging to the `EngagedUsers` segment based on specified activity criteria.
b. Reliably and securely synchronize this `EngagedUsers` segment data to MarketingOS in a format consumable by its campaign targeting system.
c. Provide runtime verification that the segment definition and synchronization process are functioning as intended, ensuring data consistency between LifeOS and MarketingOS.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a. **Segment Definition:** Implementing the `EngagedUsers` segment logic within LifeOS's user segmentation service. This includes the criteria for user inclusion/exclusion.
b. **Synchronization Trigger:** Establishing a scheduled job or an event-driven mechanism within LifeOS to periodically or reactively push updates for the `EngagedUsers` segment to MarketingOS.
c. **MarketingOS Integration (Mock/Minimal):** Implementing a minimal, secure endpoint or data ingestion service within MarketingOS (or a mock equivalent for initial proof) to receive and acknowledge the `EngagedUsers` segment data.
d. **Testing Infrastructure:** Adding unit and integration tests to validate the segment definition and the synchronization payload/process.

## 3. Exact Safe-Scope Files to Touch First

The following files are within safe scope and should be touched first:

*   `services/user-segmentation/engagedUsersSegment.js` (New file: Defines the `EngagedUsers` segment logic)
*   `services/user-segmentation/index.js` (Modification: Exports `engagedUsersSegment`)
*   `api/marketing-sync/syncEngagedUsersJob.js` (New file: Implements the scheduled synchronization job)
*   `api/marketing-sync/index.js` (Modification: Registers `syncEngagedUsersJob`)
*   `config/marketingos.js` (Modification: Adds MarketingOS API endpoint and authentication details)
*   `tests/services/user-segmentation/engagedUsersSegment.test.js` (New file: Unit tests for segment logic)
*   `tests/api/marketing-sync/syncEngagedUsersJob.test.js` (New file: Integration tests for sync job and payload)

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `engagedUsersSegment.test.js`: Verify that users meeting specific activity criteria are correctly identified as `EngagedUsers`, and users not meeting criteria are excluded.
*   **Integration Tests:**
    *   `syncEngagedUsersJob.test.js`: Simulate user activity, trigger the sync job, and assert that the correct, sanitized payload is sent to a mock MarketingOS endpoint. Verify authentication headers and data structure.
*   **Staging/Dev Environment Manual Verification:**
    *   Create a set of test users in LifeOS.
    *   Perform actions for some users to qualify them