# Proof-Closing Blueprint Note: Amendment 41 MarketingOS Proof G349-100

This document serves as a proof-closing blueprint note for `AMENDMENT_41_MARKETINGOS.md`, focusing on the verifiable implementation of the `ProofOfEngagement` signal.

## 1. Exact Missing Implementation or Proof Gap

The `ProofOfEngagement` signal, as specified in `AMENDMENT_41_MARKETINGOS.md` section 3.2.1 ("Engagement Signal Definition"), is not yet verifiably generated and dispatched to the MarketingOS `engagement-proof-sink` endpoint. The current system lacks a concrete, internal mechanism to confirm the signal's payload structure, successful HTTP 200 response from MarketingOS, and the idempotency key handling.

## 2. Smallest Safe Build Slice to Close It

Implement a temporary, internal-only `/debug/marketingos-engagement-proof` endpoint within the LifeOS `internal-api` service. This endpoint will:
1.  Accept a minimal set of parameters (e.g., `userId`, `engagementType`).
2.  Trigger the existing (or newly implemented) `marketingos-integrator` service function responsible for generating and dispatching the `ProofOfEngagement` signal.
3.  Capture and return the raw HTTP response (status code, headers, body) received from the MarketingOS `engagement-proof-sink` endpoint.
4.  Log the full outbound request and inbound response for auditability.
This slice avoids modifying core user features or TSOS customer-facing surfaces, focusing solely on proving the integration's functionality and data integrity.

## 3. Exact Safe-Scope Files to Touch First

*   `src/internal-api/routes/debug.js` (New file: Defines the `/debug/marketingos-engagement-proof` route handler).
*   `src/internal-api/services/marketingos-integrator.js` (Modify/Extend: Add or expose a function `sendProofOfEngagement` that can be called by the debug route, ensuring it returns the full HTTP response from MarketingOS).
*   `tests/internal-api/