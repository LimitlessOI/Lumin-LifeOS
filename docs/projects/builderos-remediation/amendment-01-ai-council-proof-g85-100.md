# Amendment 01 AI Council Proof: G85-100 - Initial Policy Registration Mechanism

This document serves as a proof-closing blueprint note for the initial build slice related to establishing the AI Council's foundational policy registration mechanism, as outlined in `AMENDMENT_01_AI_COUNCIL.md`.

---

## Blueprint Note for C2 Build Pass

This note outlines the next smallest build slice to progress the AI Council's policy registration.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the absence of a defined data model for AI Council policies and a foundational internal API endpoint within BuilderOS to register these policies. This includes schema validation and basic persistence.

### 2. Smallest Safe Build Slice to Close It

Implement the core data schema for an AI Council policy and a minimal `POST /builder-os/ai-council/policies` endpoint. This endpoint will accept a policy definition, validate it against the schema, and persist it to the BuilderOS internal data store. No complex policy enforcement or retrieval mechanisms are included in this slice.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/schemas/ai-policy.js`: Define the Joi/Zod schema for AI Council policy objects.
*   `src/builder-os/routes/ai-council-policies.js`: Implement the `POST /builder-os/ai-council/policies` route handler.
*   `src/builder-os/services/ai-policy-registration.js`: Contain the business logic for policy validation and persistence.
*   `src/builder-os/index.js`: Integrate the new route and service into the BuilderOS application.
*   `src/builder-os/data/ai-policies.json` (or similar internal data store): Initial placeholder for policy persistence.

### 4. Verifier/Runtime Checks

*   **API Endpoint Availability:** A `GET /builder-os/ai-council/status` (or similar lightweight endpoint) returns 200 OK.
*   **Policy Registration Success:** A `POST /builder-os/ai-council/policies` request with a valid policy payload returns 201 Created and the registered policy object.
*   **Policy Persistence:** After successful registration, a subsequent internal query confirms the policy is stored correctly in the BuilderOS data store.
*   **Schema Validation:** `POST /builder-os/ai-council/policies` with an invalid payload returns 400 Bad Request with appropriate validation errors.

### 5. Stop Conditions if Runtime Truth Disagrees

*   The `POST /builder-os/ai-council/policies` endpoint returns a 404 Not Found or 500 Internal Server Error.
*   Policy registration requests consistently fail with unexpected errors (e.g., database connection issues, unhandled exceptions).
*   Registered policies are not persisted or are corrupted in the BuilderOS internal data store.
*   Schema validation fails to correctly identify invalid policy payloads or incorrectly rejects valid ones.
*   Any modification to LifeOS user features or TSOS customer-facing surfaces is detected.