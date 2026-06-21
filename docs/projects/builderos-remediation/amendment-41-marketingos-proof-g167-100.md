<!-- SYNOPSIS: Amendment 41: MarketingOS Proof G167-100 - Proof-Closing Blueprint Note -->

# Amendment 41: MarketingOS Proof G167-100 - Proof-Closing Blueprint Note

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap related to MarketingOS signal G167-100 within the BuilderOS governed loop.

## 1. Exact Missing Implementation or Proof Gap

The primary functional gap is the absence of a robust, verifiable mechanism within BuilderOS to confirm the successful dispatch and, implicitly, the readiness for reception by MarketingOS, of the `G167-100` proof signal. Specifically, BuilderOS lacks:
*   A unique, traceable identifier (e.g., transaction ID) associated with each `G167-100` signal emission.
*   An internal BuilderOS log or state update that records the successful emission of `G167-100` with its associated identifier.
*   A BuilderOS-internal verification endpoint or function to query the status of `G167-100` signal dispatches.

The OIL verifier's rejection (`ERR_UNKNOWN_FILE_EXTENSION` for `.md` files) indicates a verifier configuration issue, not a gap in the *functional* implementation of `G167-100` proof itself. This verifier issue must be addressed for the overall C2 build pass to succeed, but it is distinct from the functional proof gap described above.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice focuses on establishing BuilderOS's internal proof of dispatch:
1.  **Signal Augmentation:** Modify the `G167-100` signal generation logic to embed a unique, immutable transaction ID.
2.  **Dispatch Logging:** Implement a BuilderOS-internal, persistent (e.g., file-based or in-memory for the current loop) log for `G167-100` dispatches, recording the transaction ID, timestamp, and payload hash.
3.  **Internal Verification Endpoint:** Create a BuilderOS-internal API or function that can query this dispatch log by transaction ID to confirm a signal's emission status.

This slice ensures BuilderOS can internally prove its part of the contract, without modifying MarketingOS or TSOS.

## 3. Exact Safe-Scope Files to Touch First

Adhering to BuilderOS-only scope and existing patterns:

*   `src/builder-os/signals/g167-emitter.js`: Augment `emitG167Signal` function to generate and include a transaction ID, and call the new logging service