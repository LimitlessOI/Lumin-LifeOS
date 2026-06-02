# Amendment 41 MarketingOS Proof (G699-100) - BuilderOS Remediation Blueprint

This document serves as the SSOT foundation for closing the proof gap identified during the OIL verifier rejection for Amendment 41, specifically concerning MarketingOS integration with BuilderOS.

## 1. Exact Missing Implementation or Proof Gap

The current BuilderOS pipeline lacks a specific validation step for the new `MarketingCampaignConfigV2` schema introduced by Amendment 41 in MarketingOS. While MarketingOS generates these configurations, BuilderOS's deployment readiness checks do not fully parse and validate the new `targetAudienceSegmentation` field, leading to potential misconfigurations or deployment failures that are not caught pre-runtime. The proof gap is the absence of a robust, schema-aware validation for this new field within the BuilderOS build process.

## 2. Smallest Safe Build Slice to Close It

Introduce a new validation function within the BuilderOS configuration processing module that specifically targets `MarketingCampaignConfigV2` objects. This function will use the existing `schema-validator` utility to enforce the `targetAudienceSegmentation` structure and constraints. The validation will be integrated into the pre-deployment manifest generation phase.

## 3. Exact Safe-Scope Files to Touch First

*   `services/builderos/src/config/marketingConfigValidator.js` (NEW FILE)
*   `services/builderos/src/pipeline/manifestGenerator.js` (MODIFY)
*   `services/builderos/src/schemas/marketingCampaignConfigV2.json` (ENSURE EXISTS/REFERENCE)

## 4. Verifier/Runtime Checks

**Unit Tests:**
*   Add unit tests for `marketingConfigValidator.js` to cover valid and invalid `targetAudienceSegmentation` structures.
*   Verify that `manifestGenerator.js` correctly calls the new validator and rejects invalid configurations.

**Integration Tests (BuilderOS CI):**
*   Create a BuilderOS test build with a deliberately malformed `MarketingCampaignConfigV2` (invalid `targetAudienceSegmentation`). Expect the build to fail with a clear validation error.
*   Create a BuilderOS test build with a correctly formed `MarketingCampaignConfigV2`. Expect the build to pass and the manifest to reflect the validated configuration.

**Manual Verification (Staging):**
*   Deploy a MarketingOS campaign using the new `MarketingCampaignConfigV2` via BuilderOS to a staging environment. Confirm successful deployment and correct application of `targetAudienceSegmentation` in the deployed service.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If BuilderOS successfully deploys a campaign with an *invalid* `targetAudienceSegmentation` (i.e., the validation step is bypassed or ineffective).
*   If BuilderOS *fails* to deploy a campaign with a *valid* `MarketingCampaignConfigV2` due to an incorrect validation error.
*   If the new validation logic introduces unexpected regressions in existing MarketingOS campaign deployments (e.g., false positives for older config versions).
*   If the performance impact of the new validation step significantly degrades BuilderOS build times (e.g., >5% increase for typical MarketingOS builds).