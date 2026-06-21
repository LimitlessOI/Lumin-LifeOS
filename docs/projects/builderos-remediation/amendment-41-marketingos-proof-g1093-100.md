<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G1093 100. -->

Amendment 41 MarketingOS Proof - G1093-100: SSOT Foundation Verification

This blueprint note addresses a critical proof gap identified in the SSOT foundation for MarketingOS, specifically concerning the `MarketingCampaign` entity. The original Amendment 41 established the conceptual framework for SSOT; this note outlines the implementation-first steps to close the verification gap.

1. Exact Missing Implementation or Proof Gap
The current implementation lacks an automated, runtime verification mechanism to confirm that the `MarketingCampaign` entity's `status` field consistently aligns with the SSOT definition and its allowed state transitions across all consuming BuilderOS-governed systems. Specifically, there is no active check ensuring that `MarketingCampaign` instances, once marked `ACTIVE` in the SSOT, are correctly reflected as `RUNNING` in downstream systems, or that `COMPLETED` campaigns are not erroneously reactivated. This gap prevents proactive detection of data drift or unauthorized state changes, undermining the SSOT's integrity for this critical entity.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves introducing a new, read-only verification service within BuilderOS. This service will periodically query `MarketingCampaign` entities from the SSOT and their corresponding representations in BuilderOS-governed downstream systems. It will perform a state comparison based on predefined SSOT rules for `MarketingCampaign` status transitions. This slice will not modify any production data but will report discrepancies.

3. Exact Safe-Scope Files to Touch First
- `builder-os/verification/marketing-campaign-ssot-verifier.js`: New module containing the core verification logic for `MarketingCampaign` status.
- `builder-os/config/verification-jobs.js`: Update to register the new `marketingCampaignSsotVerifier` job for scheduled execution.
- `builder-os/models/marketing-campaign-ssot-schema.js`: (If not already present) Define or reference the canonical SSOT schema for `MarketingCampaign` status and transitions.

4. Verifier/Runtime Checks
- **Status Consistency Check:** For each `MarketingCampaign` in SSOT, verify its `status` matches the expected state in relevant downstream BuilderOS-governed systems (e.g., `ACTIVE` in SSOT -> `RUNNING` in AdEngine integration, `COMPLETED` in SSOT -> `ARCHIVED` in reporting).
- **Transition Rule Adherence:** Verify that any observed `MarketingCampaign` status transitions in downstream systems adhere strictly to the allowed transitions defined in the SSOT schema (e.g., `PENDING` -> `ACTIVE` is allowed, `COMPLETED` -> `ACTIVE` is not without explicit re-activation logic).
- **Data Integrity Check:** Ensure critical metadata (e.g., `campaignId`, `startDate`, `endDate`) for `MarketingCampaign` entities remains consistent between SSOT and downstream systems.

5. Stop Conditions If Runtime Truth Disagrees
If the verifier/runtime checks identify discrepancies:
- **Immediate Alerting:** Trigger high-priority alerts to the BuilderOS operations team and relevant MarketingOS stakeholders.
- **Detailed Logging:** Log all detected inconsistencies with full context (entity ID, differing fields, expected vs. actual values, timestamp).
- **Automated Remediation Flag:** Mark the affected `MarketingCampaign` entities for manual review or potential automated remediation by a separate, authorized BuilderOS remediation service (not part of this build slice).
- **Verification Job Suspension:** If a high volume of consistent failures (e.g., >5% of checked campaigns fail for 3 consecutive runs) is detected, temporarily suspend the verification job to prevent alert storming and allow for investigation, while maintaining a critical alert.