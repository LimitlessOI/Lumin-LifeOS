<!-- SYNOPSIS: Amendment 09: Life Coaching Proof - G67-100 Remediation Proof Closing Note -->

# Amendment 09: Life Coaching Proof - G67-100 Remediation Proof Closing Note

This document serves as a proof-closing blueprint note for the `g67-100` build slice, addressing the verifiable proof generation for life coaching interactions as outlined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a robust, unique, and verifiable proof identifier for completed life coaching interactions. Specifically, for `g67-100`, the system lacks the mechanism to generate and persistently associate a unique `proofId` with a `CoachingInteraction` record upon its completion, which is crucial for later auditing and verification.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing a dedicated utility for generating unique proof identifiers and integrating this utility into the existing `CoachingInteraction` completion flow. This ensures that every completed interaction receives a verifiable `proofId` without altering existing user-facing features or complex business logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/lib/coachingProofGenerator.js`: (New File) A utility module responsible for generating unique, cryptographically strong proof identifiers (e.g., UUID v4 or a hash of relevant interaction metadata).
*   `src/services/coachingService.js`: (Modification) Update the `completeCoachingInteraction` or equivalent method to invoke `coachingProofGenerator.generateProofId()` and persist the returned `proofId` to the `CoachingInteraction` record.
*   `src/models/CoachingInteraction.js`: (Modification) Add a new field, `proofId: { type: String, unique: true, sparse: true }`, to the `CoachingInteraction` schema to store the generated identifier.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`src/lib/coachingProofGenerator.js`):**
    *   Verify that `generateProofId()` consistently returns a string.
    *   Verify that `generateProofId()` produces unique identifiers across multiple calls (e.g., 1000 iterations should yield 1000 unique IDs).
    *   Verify the format of the generated ID (e.g., UUID v4 pattern).
*   **Integration Tests (`src/services/coachingService.js`):**
    *   Create a mock `CoachingInteraction` record.
    *   Call `coachingService.completeCoachingInteraction(interactionId)`.
    *   Retrieve the updated `CoachingInteraction` from the database and assert that the `proofId` field is populated with a non-null, non-empty string.
    *   Assert that the `proofId` is unique for different completed interactions.
*   **Manual Runtime Check (via existing API/CLI if available):**
    *   Initiate and complete a new coaching interaction using an existing administrative or internal API endpoint.
    *   Query the database directly for the completed interaction record.
    *   Confirm that the `proofId` field is present and contains a unique identifier.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `proofId` is not generated or not persisted to the `CoachingInteraction` record upon completion.
*   If generated `proofId`s are found to be non-unique for distinct completed interactions.
*   If the `proofId` generation or storage process introduces errors or regressions into existing `CoachingInteraction` lifecycle flows.
*   If the `proofId` field is not correctly added to the `CoachingInteraction` schema or causes schema migration issues.