Amendment 41 MarketingOS Proof G883-100: Proof-Closing Blueprint Note
This document serves as the SSOT foundation for closing the proof gap related to MarketingOS Amendment 41, specifically for proof point `g883-100`.
1. Exact Missing Implementation or Proof Gap
The current LifeOS platform lacks a dedicated, auditable mechanism to confirm the successful propagation and application of user consent for marketing segment `g883-100` from MarketingOS into the LifeOS user profile and preference management system. The gap is the attestation and runtime verification that a user's `g883-100` marketing consent status, as managed by MarketingOS, is accurately reflected and actionable within LifeOS services. This includes both initial sync and subsequent updates.
2. Smallest Safe Build Slice to Close It
Introduce a new, lightweight `MarketingOSProofHandler` module within the existing `marketing` service domain. This module will:
-   Expose a secure, internal webhook endpoint (`/api/v1/marketing/proofs/g883-100/attest`) to receive `g883-100` attestation events from MarketingOS.
-   Validate incoming attestation payloads (e.g., user ID, proof timestamp, status).
-   Persist the `g883-100` proof status and timestamp for the relevant user in the `user_marketing_preferences` table (adding a new column if necessary, e.g., `g883_100_proof_status`, `g883_100_proof_timestamp`).
-   Expose a read-only internal API (`/api/v1/marketing/proofs/g883-100/:userId`) to retrieve the current `g883-100` proof status for a given user.
3. Exact Safe-Scope Files to Touch First
-   `services/marketing/MarketingOSProofHandler.js` (new module)
-   `services/marketing/index.js` (integrate `MarketingOSProofHandler` routes/logic)
-   `models/UserMarketingPreference.js` (add `g883_100_proof_status` and `g883_100_proof_timestamp` columns/fields)
-   `schemas/userMarketingPreferenceSchema.js` (update schema for new fields)
-   `routes/api/v1/marketing.js` (add new internal routes for attestation and verification)
-   `config/featureFlags.js` (add `marketingOSProofG883_100_enabled` flag)
4. Verifier/Runtime Checks
-   Unit Tests:
-   `MarketingOSProofHandler.js`: Verify payload validation, db update logic, and status retrieval.
-   Integration Tests:
-   Simulate MarketingOS sending a valid `g883-100` attestation event to the new webhook. Assert that `user_marketing_preferences` is updated correctly.
-   Call the internal verification endpoint for a user and assert the returned status matches the db.
-   Test edge cases: invalid payloads, non-existent users, concurrent updates.
-   Runtime Monitoring (Staging/Production):
-   Monitor `MarketingOSProofHandler`