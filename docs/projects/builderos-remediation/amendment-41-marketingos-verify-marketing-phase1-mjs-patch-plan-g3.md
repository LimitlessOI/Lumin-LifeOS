Amendment 41 MarketingOS: Patch Plan for scripts/verify-marketing-phase1.mjs (G3)
@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

1. Goal in plain English
To safely and minimally update `scripts/verify-marketing-phase1.mjs` to incorporate the specific requirements of Amendment 41 for Marketing Phase 1 verification, ensuring compliance with the blueprint and resolving the `ZONE3_PATCH_REQUIRED` block. The objective is to enable BuilderOS to proceed with subsequent build order tasks.

2. Why the original target is blocked or high-risk
The original `scripts/verify-marketing-phase1.mjs` is blocked due to `ZONE3_PATCH_REQUIRED`. This indicates that the existing script does not meet the updated verification criteria specified in Amendment 41, or it requires a controlled, isolated modification to prevent unintended side effects in a critical zone. Attempting a direct, un-planned modification could introduce regressions or incorrect verification logic, leading to downstream failures in the marketing pipeline or incorrect state transitions.

3. Exact controlling blueprint excerpt summary
The blueprint `docs/projects/AMENDMENT_41_MARKETINGOS.md`, section "Build Order Task 10", mandates specific verification logic for "Marketing Phase 1". This includes ensuring that all prerequisite marketing assets are correctly provisioned, initial campaign parameters are set according to defined standards, and the system state reflects readiness for the next marketing stage. It likely specifies checks for data integrity, external service connectivity relevant to marketing, and the presence of required configuration flags. The output of `verify-marketing-phase1.mjs` must accurately reflect the success or failure of these checks.

4. Smallest safe helper-extraction or surgical patch strategy
A surgical patch is the most appropriate strategy given the `ZONE3_PATCH_REQUIRED` reason and the goal of minimal change. The patch will involve directly modifying `scripts/verify-marketing-phase1.mjs` to:
    a. Identify the existing verification function or block responsible for phase 1 checks.
    b. Introduce new, minimal checks as specified by Amendment 41, or adjust existing checks.
    c. Ensure the script's return value (e.g., a boolean or a structured object indicating verification status and any failures) aligns with the expected output shape for BuilderOS.
    d. Prioritize extending existing verification logic rather than rewriting it.
    e. Example: If the blueprint requires checking for a new `marketingCampaignId` in a specific configuration, add a check for its presence and validity.

5. Required verifier checks
Upon implementation, the verifier must confirm:
    a. The patched `scripts/verify-marketing-phase1.mjs` executes without syntax errors or runtime exceptions.
    b. The script correctly identifies valid and invalid marketing phase 1 states according to Amendment 41's requirements.
    c. The return value of the script matches the expected format (e.g., `true` for success, `false` or an error object for failure).
    d. No unintended side effects are introduced; existing, unrelated verification logic remains functional.
    e. The patch adheres to existing Node/ESM patterns and code style.

6. What BuilderOS should attempt next through C2
Once this patch plan is successfully implemented and verified, BuilderOS should re-attempt "Build Order Task 10" from `docs/projects/AMENDMENT_41_MARKETINGOS.md`. If `scripts/verify-marketing-phase1.mjs` now passes, BuilderOS should then proceed to the next task in the build order as defined by the blueprint.

7. What must not be changed
    a. Any LifeOS user features or TSOS customer-facing surfaces.
    b. Core platform logic or database schemas unrelated to the specific marketing phase 1 verification.
    c. The fundamental purpose or entry point of `scripts/verify-marketing-phase1.mjs`.
    d. Any environment variables or configuration files not explicitly referenced by Amendment 41 for this verification task.
    e. The overall structure of the `scripts/` directory or other build-related scripts.