The source blueprint `docs/projects/AMENDMENT_09_LIFE_COACHING.md` was not provided, requiring inference for full context.
AMENDMENT 09: LIFE COACHING - Proof G42-100: Coach Entity & Basic Listing

This document outlines the first build slice for integrating life coaching features, specifically focusing on the foundational `Coach` entity and its basic discoverability. This aligns with Phase 1: Core infrastructure (user profiles, basic matching) as defined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.

### Proof-Closing Blueprint Note for Next Build Slice

**1. Exact Missing Implementation or Proof Gap:**
The current state defines the *concept* of a `Coach` entity and its basic listing. The gap is the concrete implementation of the `Coach` data model (schema definition) and the API endpoint to retrieve a list of these coaches. This includes database schema definition, data access layer, and a read-only API route.

**2. Smallest Safe Build Slice to Close It:**
Implement the `Coach` entity schema and a basic, unauthenticated GET endpoint for `/api/v1/coaches` that returns a paginated list of coaches. This slice focuses purely on read operations for the `Coach` entity.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builderos/models/coach.js`: Define the Mongoose/Sequelize schema for the `Coach` entity (e.g., `id`, `name`, `bio`, `specialties`, `availability`, `rate`).
*   `src/builderos/routes/coachRoutes.js`: Define the API route `GET /api/v1/coaches` to fetch coach data.
*   `src/builderos/controllers/coachController.js`: Implement the logic for fetching and returning coach data from the database.
*   `src/builderos/db/migrations/add_coach_table.js`: (If using migrations) Script to create the `coaches` table/collection.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   `test/builderos/models/coach.test.js`: Verify `Coach` model schema validation, default values, and basic CRUD operations (if applicable, for internal testing).
    *   `test/builderos/controllers/coachController.test.js`: Test the controller's logic for fetching coaches, handling pagination, and error cases.
*   **Integration Tests:**
    *   `test/builderos/routes/coachRoutes.test.js`: Send `GET /api/v1/coaches` requests and assert correct HTTP status codes (200 OK), response structure (array of coaches), and pagination metadata.
*   **Manual Verification:**
    *   Start the BuilderOS service.
    *   Use `curl` or a browser to hit `GET /api/v1/coaches`.
    *   Verify the response is a JSON array of coach objects, matching the defined schema.
    *   Verify pagination parameters (e.g., `?page=1&limit=10`) work as expected.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   `GET /api/v1/coaches` returns any HTTP status code other than 200 OK (e.g., 404, 500).
*   The response body is not a valid JSON array of coach objects.
*   Coach objects in the response do not conform to the defined `Coach` schema (e.g., missing required fields, incorrect data types).
*   Database connection errors or schema synchronization failures prevent the service from starting or fetching data.
*   Pagination parameters do not correctly filter or limit results.