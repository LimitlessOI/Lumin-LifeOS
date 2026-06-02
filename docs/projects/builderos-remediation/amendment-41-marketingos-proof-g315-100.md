# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - g315-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

---

### 1. Exact Missing Implementation or Proof Gap

The current MarketingOS platform lacks a dedicated, auditable, and automated mechanism to verify the "Guaranteed 315-day 100% attribution accuracy" (g315-100) for specific campaign types. The proof gap is the absence of a system-level assertion and validation endpoint that can programmatically confirm that the attributed user count for a given campaign within a 315-day window, as reported by MarketingOS, precisely matches the canonical source data after all processing. This is critical for establishing the SSOT foundation for attribution metrics.

### 2. Smallest Safe Build Slice to Close It

Implement a new internal `MarketingAttributionProofService` that exposes a read-only API endpoint. This endpoint will accept a `campaignId` and a `dateRange` (start/end dates) as parameters. Upon invocation, the service will:
1.  Fetch the canonical attributed user count for the specified campaign and date range from the primary data store.
2.  Calculate the attributed user count for the same campaign and date range using the MarketingOS reporting pipeline's logic.
3.  Compare these two values and return a consistency report, including the canonical value, the calculated value, and any discrepancy.
This slice focuses purely on verification and does not alter any existing data or user-facing features.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketing/MarketingAttributionProofService.js` (New service for proof logic)
*   `src/api/internal/marketingProofRoutes.js` (New internal API route definition for the proof endpoint)
*   `src/data/repositories/marketingAttributionRepository.js` (Extend existing repository