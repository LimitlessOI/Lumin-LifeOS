Amendment 01: AI Council - Proof G8-100: Member Onboarding & Access Verification
This document serves as a proof-closing blueprint note for gate `g8-100` as defined in `docs/projects/AMENDMENT_01_AI_COUNCIL.md`.
---
1. Exact missing implementation or proof gap
The current BuilderOS authorization system lacks a dedicated, auditable integration point for verifying the active status and specific role assignments of AI Council members as defined by the `ai-council-registry` service. This gap prevents dynamic enforcement of `g8-100` access policies within BuilderOS-governed loops.

2. Smallest safe build slice to close it
Implement a new `verifyAICouncilMemberAccess` function within the `member-access-service` that:
    a. Accepts a user ID and a required role (optional).
    b. Queries the `ai-council-registry` to confirm active membership and retrieve assigned roles.
    c. Returns `true` if the user is an active member and possesses the required role (if specified), `false` otherwise.
Integrate this function into the existing `authz-builder-os` middleware for relevant BuilderOS-only routes.

3. Exact safe-scope files to touch first
*   `services/member-access-service.js`: Add `verifyAICouncilMemberAccess` function.
*   `services/ai-council-registry.js`: Ensure `getMemberRoles(userId)` and `isMemberActive(userId)` are exposed.
*   `middleware/authz-builder-os.js`: Update to utilize `verifyAICouncilMemberAccess` for AI Council-specific routes.
*   `tests/unit/services/member-access-service.test.js`: Add unit tests for `verifyAICouncilMemberAccess`.
*   `tests/integration/authz-builder-os.test.js`: Add integration tests for AI Council member access scenarios.

4. Verifier/runtime checks
*   **Unit Tests:** `npm test services/member-access-service.test.js` must pass, verifying correct logic for active status and role matching.
*   **Integration Tests:** `npm test integration/authz-builder-os.test.js` must pass, confirming that BuilderOS routes correctly authorize/deny access based on AI Council membership and roles.
*   **Manual Verification (BuilderOS API/UI):**
    *   Attempt to access AI Council-restricted BuilderOS features as an active, authorized AI Council member. Expected: Access granted.
    *   Attempt to access AI Council-restricted BuilderOS features as an active, unauthorized AI Council member (wrong role). Expected: Access denied.
    *   Attempt to access AI Council-restricted BuilderOS features as a non-AI Council member. Expected: Access denied.
    *   Deactivate an AI Council member in the registry; attempt access. Expected: Access denied.

5. Stop conditions if runtime truth disagrees
*   If any unit or integration tests fail, revert the build slice and re-evaluate the implementation.
*   If manual verification reveals incorrect authorization outcomes (e.g., unauthorized access granted, authorized access denied), immediately disable the deployed changes and escalate for root cause analysis.
*   If significant performance degradation is observed in authorization latency, revert and optimize the `ai-council-registry` interaction.