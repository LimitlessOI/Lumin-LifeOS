Amendment 41: MarketingOS Proof Gap G89-100 Remediation Blueprint
Signal: This document — SSOT foundation.
This blueprint note addresses the identified proof gap G89-100 within Amendment 41 for MarketingOS, focusing on establishing verifiable processing of `MarketingEventConsentUpdate` events.
---
1. Exact Missing Implementation or Proof Gap
The current MarketingOS implementation lacks a robust, auditable mechanism to definitively prove the end-to-end ingestion, validation, and persistence of `MarketingEventConsentUpdate` events originating from LifeOS. Specifically, proof gap G89-100 highlights the absence of automated verification that a user's consent state, as communicated via these events, is accurately reflected and persisted within MarketingOS's core data stores, particularly for specific user segments critical for compliance reporting. The current state relies on indirect observation rather than direct, atomic proof of state transition.
---
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves implementing a dedicated, idempotent event listener within MarketingOS for `MarketingEventConsentUpdate` events. This listener will perform schema validation, apply business logic for consent state transitions, and persist the updated consent state to the `ConsentState` data store. This slice explicitly excludes any downstream campaign re-evaluation or user segmentation logic, focusing solely on the foundational proof of event processing and state update.
---
3. Exact Safe-Scope Files to Touch First
-   `services/marketingos/src/events/listeners/MarketingEventConsentUpdateListener.js` (New file: Implements the event consumption and initial processing logic.)
-   `services/marketingos/src/events/schemas/MarketingEventConsentUpdateSchema.js` (New file: Defines the Joi/Zod schema for validating incoming `MarketingEventConsentUpdate` payloads.)
-   `services/marketingos/src/data/repositories/ConsentRepository.js` (Extend existing or new if not present: Adds methods for `upsertConsentState(userId, consentType, status, timestamp)`.)
-   `services/marketingos/src/index.js` (Modify: Register `MarketingEventConsentUpdateListener` with the event bus.)
-   `services/marketingos/src/config/eventBus.js` (Modify: Ensure `MarketingEventConsentUpdate` event type is declared/configured for consumption.)
---
4. Verifier/Runtime Checks
1.  Event Emission Test: From a LifeOS test harness, emit a `MarketingEventConsentUpdate` event for a known test `userId` with a specific `consentType` and `status` (e.g., `email_marketing`, `opted_in`).
2.  MarketingOS Log Verification: Monitor MarketingOS service logs for successful reception, validation, and processing messages from `MarketingEventConsentUpdateListener`. Look for specific log entries indicating "Consent state updated for userId: [testUserId]".
3.  Database State Query: Directly query the MarketingOS `ConsentState` table (or equivalent data store) for the `testUserId` and `consentType`. Verify that the `status` and `updatedAt` timestamp match the emitted event's data and processing time.
4.  Idempotency Check: Emit the same event again. Verify that the `updatedAt` timestamp in the db reflects the second processing, but no new records are created if the state is identical, and no errors occur.
5.  Error Handling Test: Emit a malformed `MarketingEventConsentUpdate` event (e.g., missing required fields, invalid `status` value). Verify that MarketingOS logs schema validation errors and does not update the db for the malformed event.
---
5. Stop Conditions if Runtime Truth Disagrees
-   Event Not Consumed: If the `MarketingEventConsentUpdateListener` logs do not show evidence of event consumption within 30 seconds of emission.
-   Schema Validation Failure (Valid Event): If a correctly formed event triggers schema validation errors in MarketingOS logs.
-   Database State Mismatch: If the db query for the `testUserId` and `consentType` does not reflect the expected `status` or `updatedAt` timestamp after successful log indications.
-   Persistence Failure: If MarketingOS logs indicate successful processing but the db query shows no change or an incorrect change.
-   Non-Idempotent Behavior: If re-emitting an identical event results in duplicate records or unexpected state changes beyond an `updatedAt` timestamp update.
-   Uncaught Exceptions: Any uncaught exceptions or critical errors reported in MarketingOS logs during the processing of these events.