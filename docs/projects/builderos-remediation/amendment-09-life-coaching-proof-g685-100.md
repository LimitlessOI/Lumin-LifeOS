<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G685 100. -->

Amendment 09: Life Coaching - Proof G685-100
Reference Blueprint: `docs/projects/AMENDMENT_09_LIFE_COACHING.md`
Objective: This document serves as a proof of concept and outlines the initial, smallest build slice required to establish foundational support for Life Coaching features within the LifeOS platform, as defined by Amendment 09.

---

### Proof-Closing Blueprint Note for G685-100

This proof-of-concept (G685-100) establishes the initial documentation and conceptual framing for Life Coaching features. The next step focuses on the foundational data model and API within BuilderOS.

1.  **Exact Missing Implementation or Proof Gap:**
    The core data model for a `LifeCoach` entity is not yet defined or persisted. This includes its schema, basic CRUD operations, and integration within the BuilderOS data layer.

2.  **Smallest Safe Build Slice to Close It:**
    Define the `LifeCoach` entity schema and implement a minimal set of BuilderOS-governed API endpoints for creating, reading, updating, and deleting `LifeCoach` instances. This slice focuses solely on the BuilderOS backend, without exposing features to LifeOS users or TSOS customers.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `builder-os/schemas/lifeCoachSchema.js`: Define the Joi/Zod/Mongoose (or similar) schema for a `LifeCoach` entity (e.g., `id`, `name`, `contactInfo`, `specialties`).
    *   `builder-os/api/lifeCoachRoutes.js`: Implement BuilderOS-internal API routes (e.g., `/builder-os/api/v1/life-coaches`) for basic CRUD operations.
    *   `builder-os/services/lifeCoachService.js`: Implement the business logic and persistence layer for `LifeCoach` entities, interacting with the BuilderOS database.

4.  **Verifier/Runtime Checks:**
    *   **Schema Validation:** Verify that `lifeCoachSchema.js` is correctly parsed and registered by the BuilderOS schema management system.
    *   **API Endpoint Reachability:** Use `curl` or a similar tool to confirm that the `/builder-os/api/v1/life-coaches` endpoint is accessible and returns a 200 OK (even if empty) for a GET request.
    *   **Basic CRUD Functionality:**
        *   Attempt to POST a new `LifeCoach` object to `/builder-os/api/v1/life-coaches` and verify a 201 Created response.
        *   Attempt to GET all `LifeCoach` objects and verify the newly created coach is present.
        *   Attempt to GET a specific `LifeCoach` by ID.
        *   Attempt to PUT/PATCH an update to a `LifeCoach` and verify the change.
        *   Attempt to DELETE a `LifeCoach` and verify its removal.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   Schema definition or registration errors prevent the BuilderOS application from starting or correctly initializing the data layer.
    *   Any of the specified API endpoints return 4xx or 5xx errors for valid requests, indicating a functional failure.
    *   Data persistence or retrieval operations consistently fail, leading to inconsistent state.
    *   Any attempt to access or modify LifeOS user data or TSOS customer surfaces is detected, indicating a scope violation.