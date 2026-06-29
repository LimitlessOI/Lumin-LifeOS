<!-- SYNOPSIS: Amendment 41 MarketingOS: Patch Plan for scripts/verify-marketing-phase1.mjs (G2) -->

@ssot docs/products/builderos/PRODUCT_HOME.md
# Amendment 41 MarketingOS: Patch Plan for scripts/verify-marketing-phase1.mjs (G2)

## 1. Goal in plain English
The primary goal is to surgically implement a new, specific verification check within `scripts/verify-marketing-phase1.mjs`. This check is mandated by Amendment 41 for MarketingOS Phase 1. The objective is to integrate this new verification logic without performing a full file replacement, adhering to Zone 3 operational constraints.

## 2. Why the original target is blocked or high-risk
The target file, `scripts/verify-marketing-phase1.mjs`, is classified as a Zone 3 asset. This classification prohibits full-file builder jobs or extensive rewrites due to the high risk of introducing regressions or unintended side effects in a critical verification pipeline. Only targeted, surgical patches are permitted to maintain system stability and minimize deployment risk.

## 3. Exact controlling blueprint excerpt summary
From `docs/projects/AMENDMENT_41_MARKETINGOS.md`, Build Order Task 10 specifies the requirement for a new verification step within the MarketingOS Phase 1 verification script. This task outlines the specific criteria and expected outcomes for the new check, focusing on ensuring compliance with updated marketing data integrity standards. The blueprint mandates a precise, isolated addition to the existing verification flow.

## 4. Smallest safe helper-extraction or surgical patch strategy
The strategy involves identifying the main verification function or an appropriate insertion point within `scripts/verify-marketing-phase1.mjs`. A new, self-contained asynchronous function, e.g., `verifyMarketingPhase1Compliance()`, will be created to encapsulate the Amendment 41 logic. This function will be imported (if external) or defined locally and then called at the designated point in the existing script's execution flow, likely within an `async` block or a `Promise.all` structure, ensuring its failure propagates correctly. This minimizes changes to existing logic.

## 5. Required verifier checks
Upon patch application, BuilderOS must execute the following checks:
- **Syntax Check:** Ensure the patched `scripts/verify-marketing-phase1.mjs` remains syntactically valid Node.js ESM.
- **Linting Check:** Verify adherence to established ESLint rules.
- **Unit/Integration Tests:** Run existing tests for `scripts/verify-marketing-phase1.mjs` to confirm no regressions.
- **Functional Verification:** Execute the script with test data designed to specifically trigger and validate the new Amendment 41 check, ensuring it passes when compliant and fails when non-compliant.

## 6. What BuilderOS should attempt next through C2
BuilderOS should proceed with generating and applying the surgical patch to `scripts/verify-marketing-phase1.mjs` based on the strategy outlined in section 4. Following successful patch application, BuilderOS must then execute all required verifier checks detailed in section 5. If all checks pass, the change can be marked for deployment.

## 7. What must not be changed
- **Product Features:** No modifications to any user-facing LifeOS product features or TSOS customer surfaces.
- **Core Verification Logic:** Existing, unrelated verification checks within `scripts/verify-marketing-phase1.mjs` must remain untouched.
- **File Structure:** The overall structure and primary export of `scripts/verify-marketing-phase1.mjs` should not be altered beyond the necessary insertion point for the new check.
- **Environment Variables/DB Schema:** No new environment variables or database schema changes are permitted as part of this patch.