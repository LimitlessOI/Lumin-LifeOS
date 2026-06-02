# Proof-Closing Blueprint Note: Amendment 41 MarketingOS Remediation (G841-100)

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The current implementation lacks verifiable proof that user consent status, specifically for marketing preferences as defined by Amendment 41, is consistently and accurately propagated from LifeOS's `ConsentService` to MarketingOS. The proof gap is the absence of an end-to-end integration test and corresponding runtime telemetry confirming MarketingOS's receipt and correct interpretation of `UserConsentUpdated` events originating from LifeOS, ensuring compliance with Amendment 41's data privacy and consent propagation requirements.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated integration test suite within the LifeOS `consent-management` domain. This suite will simulate user consent changes, verify the successful emission of `UserConsentUpdated` events to the designated message queue/event bus, and confirm the event payload adheres to the schema expected by MarketingOS. This slice focuses solely on the LifeOS side of event emission and its immediate integration point, not MarketingOS's internal processing logic.

### 3. Exact Safe-Scope Files to Touch First

*   `services/consent/src/ConsentService.js`: Review and confirm event emission logic for `UserConsentUpdated` events, ensuring it aligns with Amendment