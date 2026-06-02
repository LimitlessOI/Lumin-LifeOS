# Amendment 09: Life Coaching - Proof G123-100: LifeCoach Profile Read API

## Blueprint Note: Next Smallest Build Slice

This proof-closing blueprint note addresses the foundational data model and read API for LifeCoach profiles, as outlined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md` (Phase 1: Coach Profile Foundation).

### 1. Exact Missing Implementation or Proof Gap
The core data model for `LifeCoach` entities and a basic read-only API endpoint to fetch a `LifeCoach` profile by ID are missing. This includes the schema definition and the corresponding API route.

### 2. Smallest Safe Build Slice to Close It
Implement the `LifeCoach` data model (schema) and a `GET /api/v1/lifecoaches/:id` endpoint to retrieve a single coach profile. This slice focuses solely on defining the entity structure and enabling its retrieval, without write operations or complex business logic.

### 3. Exact Safe-Scope Files to Touch First
-   `src/db/models/LifeCoach.js`: Define the Mongoose/Sequelize schema for the `LifeCoach` entity.
-   `src/api/v1/lifeCoaches.js`: Create a new router for `/api/v1/lifecoaches` and implement the `GET /:id` route handler.
-   `src/api/index.js`: Integrate the new `lifeCoaches` router into the main API router.

### 4. Verifier/Runtime Checks
-   **Positive Case:** Send a `GET` request to `/api/v1/lifecoaches/:id` with a known existing coach ID.
    -   Expected: HTTP 200 OK.
    -   Expected: Response body is a JSON object representing the `LifeCoach` profile, containing at least `id`, `userId`, `bio`, `specializations` (array), `availability` (object), `ratePerHour` (number), and `status` (string).
-   **Negative Case (Not Found):** Send a `GET` request to `/api/v1/lifecoaches/:id` with a non-existent coach ID.
    -   Expected: HTTP 404 Not Found.
-   **Schema Validation:** Verify that `specializations` is an array of strings and `ratePerHour` is a number in the retrieved object.

### 5. Stop Conditions if Runtime Truth Disagrees
-   The `GET /api/v1/