# Amendment 41: MarketingOS Proof - G663-100 Remediation Blueprint Note

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap identified for Amendment 41, related to MarketingOS integration.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the lack of a verified and documented proof for the successful integration and functionality of the `triggerCampaign` mechanism within BuilderOS, as outlined by `AMENDMENT_41_MARKETINGOS.md`. Specifically, the previous attempt to document this proof resulted in a verifier rejection due to incorrect file formatting (attempting to execute markdown as JavaScript). The underlying functional gap is the absence of a confirmed, end-to-end operational flow for triggering MarketingOS campaigns via the internal API, including message queueing and user ID hashing.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
a.  **Correcting the Proof Document:** Ensure this document (`amendment-41-marketingos-proof-g663-100.md`) is valid markdown and accurately describes the proof process.
b.  **Implementing `triggerCampaign.js`:** Complete the functional implementation of `src/api/internal/marketingos/triggerCampaign.js` to correctly utilize `publishToMarketingOSQueue` and `hashUserId`.
c.  **Establishing Verification Steps:** Define and execute a minimal set of tests to confirm that calling the internal `triggerCampaign` API successfully enqueues a message to MarketingOS with the correct payload and hashed user ID.

## 3. Exact Safe-Scope Files to Touch First

1.  `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g663-100.md` (this file) - To ensure correct markdown formatting and content.
2.  `src/api/internal/marketingos/triggerCampaign.js` - To complete the implementation of the campaign triggering logic.
3.  `src/services/messageQueue.js` (read-only) - To confirm `publishToMarketingOSQueue` signature and usage.
4.  `src/utils/userHasher.js` (read-only) - To confirm `hashUserId` signature and usage.

## 4. Verifier/Runtime Checks

1.  **Document Format Check:** The BuilderOS verifier must successfully parse `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g663-100.md` as a markdown document without syntax errors.
2.  **API Endpoint Availability:** Verify that the internal `triggerCampaign` API endpoint is accessible within the BuilderOS environment.
3.  **Message Queueing Success:**
    *   Trigger the `triggerCampaign` API with a test user ID and campaign parameters.
    *   Monitor the `MarketingOSQueue` (or a mock/test queue) to confirm a message is published.
    *   Verify the published message payload contains the expected campaign details and a correctly hashed user ID.
4.  **Idempotency Check (if applicable):** If multiple calls to `triggerCampaign` for the same user/campaign are expected to be idempotent, verify this behavior.

## 5. Stop Conditions if Runtime Truth Disagrees

1.  **Document Rejection:** If this `amendment-41-marketingos-proof-g663-100.md` file is again rejected by the verifier due to format or syntax issues, stop and re-evaluate the document's structure.
2.  **API Unreachable/Error:** If the `triggerCampaign` API endpoint is not reachable or returns an unexpected error (e.g., 5xx status, incorrect validation errors).
3.  **Message Not Enqueued:** If no message appears in the `MarketingOSQueue` after a successful API call.
4.  **Incorrect Message Payload:** If the message in the queue is malformed, missing critical data, or contains an incorrectly hashed user ID.
5.  **Unexpected Side Effects:** If triggering a campaign causes unintended modifications to LifeOS user features or TSOS customer-facing surfaces (violating the specification).