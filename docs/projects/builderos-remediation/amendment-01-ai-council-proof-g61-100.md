# Amendment 01 AI Council Proof: G61-100 - Initial Member Data Structure

This document serves as a proof-closing blueprint note for the `g61-100` build slice, focusing on the foundational data structure for AI Council members as outlined in `AMENDMENT_01_AI_COUNCIL.md`.

---

### Blueprint Note: G61-100 - AI Council Member Data Structure

**1. Exact Missing Implementation or Proof Gap:**
The initial data model and static storage mechanism for AI Council members, including their unique identifiers, names, roles, and contact information. This foundational data is essential for any subsequent operational or reporting features related to the council.

**2. Smallest Safe Build Slice to Close It:**
Define the TypeScript interface for `AiCouncilMember` and establish a static JSON file to store an initial roster of council members. This slice focuses solely on schema definition and data persistence for the core member entities, without introducing dynamic CRUD operations or complex business logic.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/lib/ai-council/types.ts`: Define the `AiCouncilMember` interface.
*   `src/lib/ai-council/data/members.json`: Create and populate with initial AI Council member data.
*   `src/lib/ai-council/index.js`: Export the `AiCouncilMember` interface and the `members.json` data for consumption within the `ai-council` library scope.

**4. Verifier/Runtime Checks:**
*   **File Existence:** Confirm `src/lib/ai-council/types.ts`, `src/lib/ai-council/data/members.json`, and `src/lib/ai-council/index.js` are present.
*   **Schema Conformance:** Verify that the data in `src/lib/ai-council/data/members.json` conforms to the `AiCouncilMember` interface defined in `src/lib/ai-council/types.ts`.
*   **Data Accessibility:** Write a temporary test script (e.g., `src/lib/ai-council/test-members.js`) that imports `members` from `src/lib/ai-council/index.js` and logs its content, ensuring it's a non-empty array of objects matching the expected structure.
*   **Type Safety (if applicable):** Ensure TypeScript compilation passes without errors when consuming the `AiCouncilMember` type and the `members` data.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `src/lib/ai-council/data/members.json` is missing, malformed, or inaccessible.
*   If the data loaded from `members.json` does not match the `AiCouncilMember` interface (e.g., missing required fields, incorrect types).
*   If `src/lib/ai-council/index.js` fails to correctly export the `members` data, preventing its consumption by other modules.
*   If the temporary test script fails to import or log the member data successfully.