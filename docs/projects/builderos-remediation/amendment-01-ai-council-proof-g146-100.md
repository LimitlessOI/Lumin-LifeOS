# Amendment 01: AI Council Proof - G146-100

## Proof-Closing Blueprint Note

This document outlines the next smallest build slice required to provide initial proof for Amendment 01, establishing the AI Council. This specific proof point, G146-100, focuses on the foundational step of identifying and recording AI Council members.

### 1. Exact Missing Implementation or Proof Gap

The `AMENDMENT_01_AI_COUNCIL.md` blueprint defines the strategic necessity and high-level mandate of the AI Council. The current gap is the lack of a concrete, persistent mechanism within LifeOS to formally identify, store, and manage the foundational data for AI Council members. Without this, the council's existence and operational readiness cannot be programmatically verified or integrated into subsequent governance workflows.

### 2. Smallest Safe Build Slice to Close It

Implement a minimal, internal data model and associated service layer functions to register and retrieve AI Council members. This slice will establish the core data persistence for council members, including their unique identifiers, names, roles, and status, without exposing these details via external APIs or user interfaces at this stage. The focus is solely on backend data integrity and service-level operations.

### 3. Exact Safe-Scope Files to Touch First

*   `src/lib/ai-council/aiCouncilMember.model.js`: Define the data model (e.g., Mongoose schema or Prisma model) for `AiCouncilMember`. This model will include fields such as `id` (UUID), `name` (string), `role` (string, e.g., "Chair", "Member"), `email` (string), `status` (enum: "active", "inactive"), `createdAt` (Date), `updatedAt` (Date).
*   `src/lib/ai-council/aiCouncilMember.service.js`: Implement core service functions:
    *   `createAiCouncilMember(memberData)`: Persists a new AI Council member record.
    *   `getAiCouncilMemberById(id)`: Retrieves an AI Council member by their ID.
    *   `listAiCouncilMembers()`: Retrieves all active AI Council members.
*   `src/lib/ai-council/index.js`: Export the new model and service functions for internal consumption within the `ai-council` module.

### 4. Verifier/Runtime Checks

*   **Unit Tests:** Develop comprehensive unit tests for `aiCouncilMember.service.js` to ensure:
    *   Successful creation of new `AiCouncilMember` records with valid data.
    *   Correct retrieval of members by ID and listing of all members.
    *   Appropriate error handling for invalid input or database failures.
*   **Database Inspection:** Manually verify via direct database query (e.g., `mongo` shell, `psql` client) that the `AiCouncilMember` collection/table is created correctly and that records inserted via the service layer are present and accurately stored.
*   **Internal Service Call:** Execute a temporary, isolated script or a dedicated internal test endpoint that directly calls `createAiCouncilMember` and `getAiCouncilMemberById` to confirm end-to-end data flow within the service layer.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Model/Schema Definition Failure:** If the `AiCouncilMember` model or schema cannot be correctly defined, initialized, or synchronized with the underlying database.
*   **Service Function Failure:** If `createAiCouncilMember`, `getAiCouncilMemberById`, or `listAiCouncilMembers` functions consistently fail to perform their intended operations (e.g., data persistence