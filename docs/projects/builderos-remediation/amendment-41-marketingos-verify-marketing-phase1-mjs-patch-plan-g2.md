@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
Amendment 41 MarketingOS: Patch Plan for scripts/verify-marketing-phase1.mjs (G2)

1. Goal in plain English
To implement a minimal, safe patch to `scripts/verify-marketing-phase1.mjs` to incorporate new MarketingOS verification logic as required by Amendment 41, specifically for Build Order Task 10. The objective is to extend existing verification capabilities without a full-file replacement, ensuring stability and adherence to Zone 3 file handling protocols.

2. Why the original target is blocked or high-risk
The target file, `scripts/verify-marketing-phase1.mjs`, is designated as a Zone 3 asset. This classification implies high sensitivity and criticality, making full-file builder jobs inherently high-risk and explicitly blocked by the OIL verifier. A full replacement could introduce unforeseen regressions or break existing, stable verification flows. The current directive mandates a patch plan only, emphasizing surgical modifications over broad changes to maintain system integrity.

3. Exact controlling blueprint excerpt summary
From `docs/projects/AMENDMENT_41_MARKETINGOS.md`, Build Order Task 10 specifies: "Integrate new MarketingOS verification logic into `scripts/verify-marketing-phase1.mjs` to confirm successful phase 1 marketing campaign setup. This involves checking for specific API responses or database entries related to campaign activation." The core requirement is to add a new verification step to validate MarketingOS phase 1 readiness.

4. Smallest safe helper-extraction or surgical patch strategy
The strategy involves identifying the primary verification function or a suitable insertion point within `scripts/verify-marketing-phase1.mjs`. A new, self-contained asynchronous function, e.g., `verifyMarketingOSPhase1()`, will be created to encapsulate the new checks. This function will perform the necessary API calls or database queries to validate MarketingOS phase 1 status. It will return a boolean indicating success or throw a specific error on failure. The existing main verification flow in `scripts/verify-marketing-phase1.mjs` will then be minimally modified to `await` and integrate the result of `verifyMarketingOSPhase1()` into its overall verification outcome. This approach isolates the new logic, minimizes changes to existing code, and facilitates easy rollback if necessary.

5. Required verifier checks
*   **Syntax Check:** Confirm the patched `scripts/verify-marketing-phase1.mjs` adheres to valid ES module syntax and Node.js best practices.
*   **Functional Check (New Logic):** Execute the patched script to ensure `verifyMarketingOSPhase1()` correctly identifies both successful and failed MarketingOS phase 1 setups according to Amendment 41 specifications.
*   **Regression Check (Existing Logic):** Verify that all pre-existing verification checks within `scripts/verify-marketing-phase1.mjs` continue to function as expected without any unintended side effects from the patch.
*   **Performance Check:** Ensure the addition of the new verification logic does not introduce significant latency or resource consumption.
*   **Error Handling Check:** Confirm robust error handling for the new MarketingOS verification, including appropriate logging and graceful failure mechanisms.

6. What BuilderOS should attempt next through C2
BuilderOS should generate a precise, minimal patch (e.g., a `git diff` or specific line-based insertions/modifications) targeting `scripts/verify-marketing-phase1.mjs`. This patch will implement the `verifyMarketingOSPhase1()` function and its integration point as described in section 4. The generated patch should then be submitted for C2 review, approval, and subsequent automated application.

7. What must not be changed
*   Any core business logic or product features of the LifeOS platform.
*   Any customer-facing surfaces or functionalities provided by TSOS.
*   Existing, unrelated verification logic within `scripts/verify-marketing-phase1.mjs`.
*   The fundamental ES module structure, import/export statements, or overall architectural patterns of `scripts/verify-marketing-phase1.mjs`.
*   Environment variables or database schemas not explicitly approved by Amendment 41.