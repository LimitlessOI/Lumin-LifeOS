# Command Center V2 Blueprint Proof: G447-100 - Core Data Model & API (Proof of Concept)

## Blueprint Note: Next Smallest Build Slice

This note addresses the immediate next step outlined in the `COMMAND_CENTER_V2_BLUEPRINT.md` for Phase 1: Core Data Model & API (Proof of Concept). The goal is to establish the foundational data models and basic CRUD operations for `CommandDefinition` and `CommandInstance`.

---

### 1. Exact Missing Implementation or Proof Gap

The blueprint explicitly states the need to "Implement the basic data models and their respective CRUD operations for `CommandDefinition` and `CommandInstance`." The current gap is the absence of these models, their persistence layer (e.g., Mongoose schemas and models), and the corresponding API endpoints to perform Create, Read, Update, and Delete operations for these two core entities. The proof goal is to demonstrate that `CommandDefinition` and `CommandInstance` can be successfully created, stored, and retrieved.

### 2. Smallest Safe Build Slice to Close It

Implement the Mongoose schemas and models for `CommandDefinition` and `CommandInstance`, along with minimal Express.js API routes to expose basic CRUD functionality for each. This slice focuses solely on data persistence and API accessibility, without delving into execution logic or complex business rules.

### 3. Exact Safe-Scope Files to Touch First

*   `src/models/CommandDefinition.js`: Define the Mongoose schema and model for `CommandDefinition`.
*   `src/models/CommandInstance.js`: Define the Mongoose schema and model for `CommandInstance`.
*   `src/routes/commandDefinitionRoutes.js`: Implement Express.js routes for `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` for `CommandDefinition`.
*   `src/routes/commandInstanceRoutes.js`: Implement Express.js routes for `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` for `CommandInstance`.
*   `src/app.js` (or `src/server.js`): Integrate the new `commandDefinitionRoutes` and `commandInstanceRoutes` into the main application.

### 4. Verifier/Runtime Checks

*   **API Test - CommandDefinition Creation:**
    *   `POST /api/v2/command-definitions` with a valid `name` and `description` payload should return `201 Created` and the created `CommandDefinition` object, including its `_id`.
*   **API Test - CommandDefinition Retrieval:**
    *   `GET /api/v2/command-definitions/{id}` (using an `_id` from a successful creation) should return `200 OK` and the corresponding `CommandDefinition` object.
*   **API Test - CommandInstance Creation:**
    *   `POST /api/v2/command-instances` with a valid `commandDefinitionId` (referencing an existing `CommandDefinition`) and `parameters` payload should return `201 Created` and the created `CommandInstance` object, including its `_id`.
*   **API Test - CommandInstance Retrieval:**
    *   `GET /api/v2/command-instances/{id}` (using an `_id` from a successful creation) should