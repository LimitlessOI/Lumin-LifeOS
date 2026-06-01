Amendment 01: AI Council - Proof G8-100: Member Onboarding & Access Verification
This document serves as a proof-closing blueprint note for gate `g8-100` as defined in `docs/projects/AMENDMENT_01_AI_COUNCIL.md`.

---

### 1. Exact missing implementation or proof gap

The current BuilderOS platform lacks a formalized, auditable, and automated process for onboarding new AI Council members and subsequently verifying their access privileges within the BuilderOS-governed loop execution. Specifically, the gap is the absence of:
*   A dedicated data model for AI Council members, including their roles and assigned permissions.
*   API endpoints and business logic to initiate and complete the onboarding process (e.g., member registration, role assignment).
*   Runtime access control mechanisms that leverage the defined member roles to gate access to BuilderOS-specific functionalities, ensuring compliance with AI Council mandates.
*   Audit trails for member onboarding and access changes.

### 2. Smallest safe build slice to close it

Implement the core data model and a minimal set of API endpoints for AI Council member registration and basic role assignment, along with a foundational access verification utility. This slice focuses on establishing the necessary data structures and the initial entry points for member management without impacting existing LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact safe-scope files to touch first

*   `src/builder/schemas/aiCouncilMemberSchema.js`: Define the Joi/Zod schema for AI Council member data (e.g., `id`, `name`, `email`, `roles`, `status`).
*   `src/builder/services/aiCouncilMemberService.js`: Implement CRUD operations for AI Council members, focusing initially on `createMember` and `getMemberById`.
*   `src/builder/routes/aiCouncilMemberRoutes.js`: Add a POST endpoint for `/builder/ai-council/members` to register a new member.
*   `src/builder/utils/accessVerifier.js`: A utility function `verifyAiCouncilAccess(memberId, requiredRole)` that checks a member's roles against required permissions.
*   `src/builder/middleware/aiCouncilAuth.js`: A middleware to apply `accessVerifier` to BuilderOS-specific routes.
*   `src/builder/tests/aiCouncilMemberService.test.js`: Unit tests for the service layer.
*   `src/builder/tests/aiCouncilMemberRoutes.test.js`: Integration tests for the new API route.

### 4. Verifier/runtime checks

*   **Unit Tests:** All functions in `aiCouncilMemberService.js` and `accessVerifier.js` pass their respective unit tests, covering valid and invalid inputs, edge cases, and error handling.
*   **Integration Tests:** The `/builder/ai-council/members` POST endpoint successfully creates a new member with the correct data and returns a 201 status. Attempts to create members with invalid data return appropriate 4xx errors.
*   **Access Verification Tests:** `verifyAiCouncilAccess` correctly grants/denies access based on mock member roles and required permissions. The `aiCouncilAuth` middleware correctly blocks unauthorized requests to protected BuilderOS routes.
*   **Manual Verification (Staging):** Deploy to a staging environment. Use a tool like Postman or a simple client to register a new AI Council member. Attempt to access a protected BuilderOS endpoint with and without the correct member credentials/roles.

### 5. Stop conditions if runtime truth disagrees

*   **Data Inconsistency:** Registered member data in the database does not match the input or expected schema.
*   **API Failures:** The `/builder/ai-council/members` endpoint consistently returns server errors (5xx) or incorrect client errors (4xx) for valid requests.
*   **Access Control Bypass:** An unauthorized request successfully accesses a BuilderOS resource protected by `aiCouncilAuth`.
*   **Performance Degradation:** Introduction of the new services or middleware significantly impacts the response time of existing BuilderOS endpoints (e.g., >10% increase in average latency).
*   **Security Vulnerabilities:** Any identified vulnerability related to member data handling or access control.