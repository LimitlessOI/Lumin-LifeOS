<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS Proof: G125-100 - SSOT Foundation Verification -->

# AMENDMENT_41_MARKETINGOS Proof: G125-100 - SSOT Foundation Verification

This document outlines the proof-closing blueprint note for verifying the Single Source of Truth (SSOT) foundation established by AMENDMENT_41_MARKETINGOS.

---

## 1. Exact Missing Implementation or Proof Gap

The core gap is the *observability and automated verification* that the data designated as SSOT within MarketingOS is consistently propagated and consumed by dependent services without deviation, ensuring its foundational integrity. Specifically, a mechanism to assert that `MarketingOS.SSOT.CustomerProfile` data remains consistent across its primary store and key downstream caches/indices. The amendment establishes the SSOT; this proof closes the loop by verifying its runtime truth.

## 2. Smallest Safe Build Slice to Close It

Implement a new internal diagnostic endpoint or a scheduled background job within an existing `diagnostics` or `monitoring` service that performs a cross-system data consistency check for a statistically significant, anonymized sample set of `CustomerProfile` records. This slice must be *read-only*, *not modify* any production data, and operate within existing infrastructure patterns. It will compare the canonical SSOT representation of a profile against its representation in critical downstream consumers.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/diagnostics/ssot-customer-profile-verifier.js` (New module for the core verification logic)
*   `src/routes/internal/diagnostics.js` (Extend to expose a new `GET /internal/diagnostics/ssot-customer-profile-consistency` endpoint)
*   `src/config/feature-flags.js` (Add a `featureFlag.enableSsotCustomerProfileVerifier` flag)
*   `src/utils/data-comparison.js` (If a new deep comparison utility is required, otherwise use existing)

## 4. Verifier/Runtime Checks

1.  **Trigger:** Invoke `GET /internal/diagnostics/ssot-customer-profile-consistency` (or trigger the scheduled job).
2.  **Sample Selection:** The verifier selects a random, anonymized sample of `N` `CustomerProfile` IDs from the SSOT primary store. `N` should be configurable (e.g., 1000).
3.  **SSOT Primary Read:** For each sampled ID, retrieve the full `CustomerProfile` data directly from the SSOT primary database.
4.  **Downstream Reads:** For each sampled ID, retrieve the corresponding `CustomerProfile` data from critical downstream systems (e.g., `MarketingCampaignService` cache, `AnalyticsReportingDB`, `PersonalizationEngineIndex`).
5.  **Canonical Comparison:** Convert all retrieved profile data (SSOT and downstream) into a canonical, sorted JSON representation. Perform a deep comparison (e.g., hash comparison) between the SSOT primary representation and each downstream system's representation.
6.  **Reporting:** Log any discrepancies found, including `profileId`, `fieldPath`, `ssotValue`, `downstreamValue`, `downstreamSystem`, and `timestamp`. The endpoint/job