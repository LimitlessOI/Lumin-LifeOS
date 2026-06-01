# Amendment 09: Life Coaching Proof - Build Slice G94-100

## Proof-Closing Blueprint Note

This note addresses the initial implementation and proof gap for establishing the core concept of a user's Life Coaching Goal, specifically covering the requirements outlined in blueprint range G94-100. The focus is on demonstrating the foundational data model and API interaction for goal creation and retrieval.

### 1. Exact Missing Implementation or Proof Gap

The exact missing implementation is the foundational data model and API endpoint for a `CoachingGoal` entity. This gap prevents the system from persisting and retrieving a user's defined coaching goals, which is critical for proving the viability of the Life Coaching feature. Specifically, the ability to:
*   Define a `CoachingGoal` with a `userId`, `title`, `description`, and `status`.
*   Create a new `CoachingGoal` via an API.
*   Retrieve an existing `CoachingGoal` by its ID via an API.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining a simple schema for `CoachingGoal`.
2.  Implementing a basic service layer to interact with the data store (e.g., create and find operations).
3.  Exposing RESTful API endpoints for creating and retrieving `CoachingGoal` instances.
This slice focuses purely on the backend persistence and API exposure, without touching any user-facing UI or complex business logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/schemas/coachingGoal.js`: Define the Mongoose/ORM schema for `CoachingGoal`.
*   `src/services/coachingGoalService.js`: Implement `createCoachingGoal` and `getCoachingGoalById` functions.
*   `src/routes/coachingGoalRoutes.js`: Define `POST /api/v1/coaching-goals` and `GET /api/v1/coaching-goals/:id` endpoints.
*   `src/app.js` (or `src/server.js`): Mount the `coachingGoalRoutes` to the main application router.

### 4. Verifier/Runtime Checks

*   **API Test (Create):**
    *   `POST /api/v1/coaching-goals` with a valid payload `{ userId: 'user123', title: 'Achieve Fitness', description: 'Run a marathon', status: 'active' }`.
    *   Expected outcome: HTTP 201 Created, response body contains the newly created goal object with an `_id`.
*   **API Test (Retrieve):**
    *   `GET /api/v1/coaching-goals/:id` (using the `_id` from the creation test).
    *   Expected outcome: HTTP 200 OK, response body contains the matching `CoachingGoal` object.
*   **Database Check:** Verify that the `coachingGoals` collection in the database contains the created goal.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /api/v1/coaching-goals` returns any status other than 201, or if the response body does not contain a valid `CoachingGoal` object with an `_id`.
*   If `GET /api/v1/coaching-goals/:id` returns any status other than 200, or if the retrieved goal does not match the one created.
*   If database inspection reveals that goals are not being persisted or are malformed.
*   If existing core LifeOS routes or services exhibit regressions after integrating the new routes/schemas.