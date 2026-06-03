@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
# Amendment 41 MarketingOS: Patch Plan for scripts/verify-marketing-phase1.mjs (G2)

This document outlines a blueprint-first patch plan for `scripts/verify-marketing-phase1.mjs` as mandated by Amendment 41 MarketingOS, specifically addressing Build Order Task 10.

---

## 1. Goal in plain English

The primary goal is to surgically integrate a new, specific verification check into the existing `scripts/verify-marketing-phase1.mjs` script. This integration must be minimal, targeted, and avoid a full file replacement, ensuring the stability and integrity of a critical Zone 3 verification process. The new check will validate a specific condition related to MarketingOS Phase 1 requirements as defined in Amendment 41.

## 2. Why the original target is blocked or high-risk

`scripts/verify-marketing-phase1.mjs` is classified as a Zone 3 target. This classification indicates that the script is highly sensitive, potentially impacting core system stability or critical operational flows. A full file replacement carries a significant risk of introducing regressions, subtle behavioral changes, or unintended side effects that could disrupt the marketing verification pipeline. Therefore, only a precisely scoped patch plan is permissible to mitigate these risks and maintain system reliability.

## 3. Exact controlling blueprint excerpt summary

From `docs/projects/AMENDMENT_41_MARKETINGOS.md`, Build Order Task 10 states:
"**Task 10: Integrate MarketingOS Phase 1 Verification Logic**
Target: `scripts/verify-marketing-phase1.mjs`
Action: Implement new verification logic for MarketingOS Phase 1.
Constraint: Due to Zone 3 classification, this task requires a *patch plan only*. A full file replacement is prohibited. The patch must be surgical, adding specific checks without altering existing, unrelated verification flows."

## 4. Smallest safe helper-extraction or surgical patch strategy

The strategy involves identifying the main verification function within `scripts/verify-marketing-phase1.mjs` (e.g., `verifyPhase1MarketingData`). Within this function, a new, dedicated helper function or a distinct code block will be introduced. This new logic will encapsulate the Amendment 41 specific verification.

**Proposed Patch Structure:**
1.  **Identify Insertion Point:** Locate the logical end of existing, general Phase 1 checks or a suitable point before the final `return` statement in the primary verification function.
2.  **Define New Helper (if complex):** If the new logic is substantial, define a new `async function verifyAmendment41MarketingPhase1(data)` within the module, exporting it if it needs to be tested independently, or keeping it local if it's tightly coupled.
3.  **Call New Logic:** Add a call to this new helper or embed the new verification block directly at the identified insertion point.
4.  **Error Handling:** Ensure any failures from the new check are handled consistently with existing error reporting mechanisms (e.g., throwing specific errors, returning a status object).
5.  **Minimal Imports/Dependencies:** Introduce only necessary imports for the new logic, avoiding unnecessary additions to the module's dependency graph.

Example (conceptual):
```javascript
// scripts/verify-marketing-phase1.mjs (patch target)
import { existingUtil } from './utils.mjs';
// ... existing imports ...

// New helper function for Amendment 41 specific checks
async function verifyAmendment41MarketingPhase1(data) {
  // Implement specific checks based on Amendment 41 requirements
  if (!data.marketingCampaignId || data.marketingCampaignId.length === 0) {
    throw new Error('Amendment 41: Missing marketingCampaignId.');
  }
  // ... additional checks ...
  return true;
}

export async function verifyPhase1MarketingData(data) {
  // ... existing verification logic ...

  // --- START AMENDMENT 41 PATCH ---
  try {
    await verifyAmendment41MarketingPhase1(data);
  } catch (error) {
    console.error('Amendment 41 verification failed:', error.message);
    throw new Error(`MarketingOS Phase 1 (Amendment 41) verification failed: ${error.message}`);
  }
  // --- END AMENDMENT 41 PATCH ---

  // ... existing final checks ...
  return { success: true, message: 'Marketing Phase 1 data verified.' };
}
```

## 5. Required verifier checks

BuilderOS must perform the following checks after applying the patch:
*   **ESM Syntax Validation:** Ensure `scripts/verify-marketing-phase1.mjs` remains valid ES module syntax and can be imported/executed without `ERR_UNKNOWN_FILE_EXTENSION` or similar Node.js module resolution errors.
*   **Unit Test Execution (Existing):** Run all pre-existing unit tests associated with `scripts/verify-marketing-phase1.mjs` to confirm no regressions have been introduced.
*   **New Logic Unit Test:** Introduce a new, dedicated unit test specifically for `verifyAmendment41MarketingPhase1` (or the inline logic) to validate its correct behavior under both success and failure conditions as per Amendment 41 specifications.
*   **Integration Test (MarketingOS Flow):** Execute a high-