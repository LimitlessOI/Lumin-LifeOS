# Amendment 41: MarketingOS Proof - G95-100 Remediation Blueprint

This document outlines the remediation plan to close the proof gap identified for MarketingOS integration, specifically concerning campaign finalization status updates for campaigns in the G95-G100 range. This serves as the SSOT foundation for the next C2 build pass.

## 1. Exact Missing Implementation or Proof Gap

The current BuilderOS `CampaignFinalizerService` does not reliably propagate the `FINALIZED` status for MarketingOS campaigns within the G95-G100 ID range to the MarketingOS API endpoint `/api/v1/campaigns/{campaignId}/status`. Specifically, the proof failed to confirm that the `status` field in MarketingOS reflects `FINALIZED` after BuilderOS marks a campaign as complete. The gap is the missing or incorrect API call payload/timing for this specific campaign ID range.

## 2. Smallest Safe Build Slice to Close It

Implement a targeted update within the `CampaignFinalizerService` to ensure that for campaigns with IDs between G95 and G100 (inclusive), an explicit API call is made to MarketingOS with the `FINALIZED` status. This slice will focus solely on the conditional logic and API invocation for this specific ID range, without altering existing finalization logic for other campaign types or ranges.

## 3. Exact Safe-Scope Files to Touch First

- `services/builderos/CampaignFinalizerService.js`: Modify the `finalizeCampaign` method to include the conditional MarketingOS API call.
- `tests/services/builderos/CampaignFinalizerService.test.js`: Add a new test case to specifically verify the MarketingOS status update for a campaign in the G95-G100 range.
- `config/marketingos.js`: Verify or add the MarketingOS API endpoint configuration if not already present.

## 4. Verifier/Runtime Checks

1.  **Unit Test Execution:** Run `npm test tests/services/builderos/CampaignFinalizerService.test.js` and ensure the new test case passes, confirming the correct API payload and endpoint are used.
2.  **Local Integration Test:**
    *   Start BuilderOS locally.
    *   Using a test client (e.g., Postman, `curl`), trigger the BuilderOS endpoint that finalizes a campaign with an ID like `G97`.
    *   Immediately query the MarketingOS API endpoint `/api/v1/campaigns/G97` (or equivalent) to verify the `status` field is `FINALIZED`.
3.  **Log Verification:** Monitor BuilderOS logs for successful API calls to MarketingOS, specifically looking for `[MarketingOSClient] Successfully updated campaign G97 status to FINALIZED`.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Unit Test Failure:** If the new unit test for `CampaignFinalizerService` fails, indicating incorrect API call parameters or logic.
*   **MarketingOS Status Mismatch:** If, after triggering campaign finalization in BuilderOS, the MarketingOS API for the specific campaign ID (e.g., G97) does not return `status: "FINALIZED"` within 5 seconds.
*   **BuilderOS Error Logs:** If BuilderOS logs show any errors related to the MarketingOS API client (e.g., network errors, authentication failures, 4xx/5xx responses from MarketingOS) during the finalization process for G95-G100 campaigns.
*   **Performance Degradation:** If the finalization process for *any* campaign type shows a measurable increase in latency (e.g., >100ms) after the change, indicating an unintended side effect.