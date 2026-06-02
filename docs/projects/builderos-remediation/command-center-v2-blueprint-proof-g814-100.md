# Command Center V2 Blueprint Proof: G814-100 - Initial BuilderOS Event Ingestion

This document serves as a proof-closing blueprint note for the first build slice derived from `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`. It focuses on establishing the foundational data ingestion for BuilderOS events.

---

## Blueprint Note: BuilderOS Event Ingestion Endpoint

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the absence of a functional API endpoint to receive and persist BuilderOS events as specified in `Phase 1, Milestone 1.1, Item 1.1.1` of the blueprint. Specifically, the `POST /api/v2/builder-events` endpoint, its data schema validation, persistence mechanism, and internal API key authentication are not yet implemented.

**2. Smallest Safe Build Slice to Close It:**
Implement the `POST /api/v2/builder-events` endpoint. This slice encompasses:
    *   Defining the API route.
    *   Creating a request handler that validates the incoming event schema (`eventType: string, timestamp: string, payload: object`).
    *   Persisting the validated event data to the `events` database table.
    *   Applying internal API key authentication to secure the endpoint.
    *   Ensuring the `events` table exists and has the necessary columns (or can be created/migrated if not present, though preference is for existing).

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/v2/builder-events/post.js`: New file. Contains the Express/Koa route handler logic for `POST /api/v2/builder-events`, including schema validation and calling the event service.
*   `src/api/v2/builder-events/index.js`: New file. Exports the `post.js` handler and registers it under the `/api/v2/builder-events` path.
*   `src/api/v2/index.js`: Existing file. Extend to import and register the `builder-events` routes.
*   `src/middleware/auth/internalApiKey.js`: New or existing file. Implement/extend middleware for internal API key validation.
*   `src/services/eventService.js`: New file. Encapsulates database operations for events (e.g., `createEvent(eventData)`).
*   `src/data/models/Event.js` or `src/db/queries/events.js`: New or existing file. Defines the data model or raw query functions for the `events` table.
*   `src/config/index.js` or `src/config/auth.js`: Existing file. Add/verify configuration for the internal API key.

**4. Verifier/Runtime Checks:**
*   **Positive Case (Success):**
    *   Send `POST /api/v2/builder-events` with a valid internal API key and a payload like `{ "eventType": "BUILD_START", "timestamp": "2023-10-27T10:00:00Z", "payload": { "buildId": "g