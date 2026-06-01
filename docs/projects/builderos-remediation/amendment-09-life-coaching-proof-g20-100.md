Amendment 09: Life Coaching - Proof G20-100
Proof-Closing Blueprint Note
This note outlines the next smallest build slice for the Life Coaching feature, focusing on establishing the foundational data model and the initial session creation API.
---
1. Exact Missing Implementation or Proof Gap
The core `CoachingSession` data model definition and the initial apiEP to create a new coaching session are missing. Specifically, the system lacks the ability to persist the state of a new coaching session and expose an endpoint for users to initiate this process.
2. Smallest Safe Build Slice to Close It
Implement the `CoachingSession` data model (e.g., Mongoose schema) and the `POST /api/v1/life-coaching/start` apiEP. This endpoint will be responsible for:
1.  Receiving a request to start a new session.
2.  Creating a new `CoachingSession` record in the db.
3.  Setting its initial `status` to 'initialized'.
4.  Assigning a placeholder `currentPrompt`.
5.  Returning the newly created `sessionId` to the user.
This slice establishes the persistence layer for sessions and the entry point for the feature.
3. Exact Safe-Scope Files to Touch First
-   `src/models/CoachingSession.js`: Define the Mongoose schema for `CoachingSession`.
-   `src/services/LifeCoachService.js`: Add a `startSession` method to create and save a new `CoachingSession` instance.
-   `src/routes/lifeCoachingRoutes.js`: Create a new router file and define the `POST /api/v1/life-coaching/start` endpoint, linking it to `LifeCoachService.startSession`.
-   `src/app.js` (or equivalent main entry point): Register `lifeCoachingRoutes` with the main application.
4. Verifier/Runtime Checks
1.  API Call: Send a `POST` request to `/api/v1/life-coaching/start` (e.g., `curl -X POST http://localhost:3000/api/v1/life-coaching/start -H "Content-Type: application/json" -d '{"userId": "testUser123"}'`).
2.  Response Validation: Verify the API response contains a `201 Created` status code, a `sessionId` (UUID format), and an initial `status` (e.g., 'initialized').
3.  Database Inspection: Query the db directly (e.g., using MongoDB Compass or `mongo` shell) to confirm that a new `CoachingSession` record exists with the returned `sessionId`, the correct `userId`, `status: 'initialized'`, and a non-empty `currentPrompt` (even if placeholder).
5. Stop Conditions if Runtime Truth Dis