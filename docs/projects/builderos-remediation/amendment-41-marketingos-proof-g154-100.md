# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Proof G154-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

This blueprint note addresses the proof gap G154-100, focusing on the end-to-end verification of the `UserSignedUpForNewsletter` marketing event as defined in Amendment 41.

### 1. Exact Missing Implementation or Proof Gap

The current implementation ensures the `UserSignedUpForNewsletter` event is emitted by LifeOS and processed by the `marketing-event-processor` service. The proof gap G154-100 is the lack of explicit, automated verification that this event, after processing, successfully triggers the intended API call to the configured third-party marketing platform (e.g., Mailchimp) with the correct payload and receives a successful response. This gap means we lack a robust, automated proof of external system integration for this specific event.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves enhancing the `marketing-event-processor` service to facilitate testability of its external API interactions and adding a dedicated integration test. This slice will:
*   Introduce a mechanism (e.g., dependency injection, mockable client) within `marketing-event-processor` to allow mocking of the third-party marketing platform's API client during tests.
*   Implement an integration test that simulates the `UserSignedUpForNewsletter` event being processed and asserts that the mocked third-party API client receives the expected call with the correct data.
*   Add detailed logging within the `newsletterSignupHandler` to record the outcome (success/failure, payload summary) of the external API call.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketing-event-processor/src/handlers/newsletterSignupHandler.ts`: Modify to inject or use a mockable client for the external marketing platform and add detailed logging for API call outcomes.
*   `services/marketing-event-processor/src/clients/mailchimpClient.ts` (or equivalent): Refactor to