# Amendment 09: Life Coaching Integration - Proof G16-100: CoachProfile Core Model & API

This document outlines the first granular build slice for integrating life coaching features, focusing on the foundational `CoachProfile` data model and its initial API endpoints.

---

## Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The core data model definition and persistence layer for `CoachProfile`, along with a minimal set of API endpoints to create and retrieve coach profiles. This establishes the fundamental entity required for all subsequent coaching features.

**2. Smallest safe build slice to close it:**
Implement the `CoachProfile` schema definition and a basic `/api/coaches` endpoint. This slice includes:
*   Defining the `CoachProfile` data structure (e.g., name, bio, specialties, availability).
*   Creating a service layer function to handle `CoachProfile` CRUD operations (initially create and fetch).
*   Adding Express.js route handlers for `POST /api/coaches` (create a new coach profile) and `GET /api/coaches` (retrieve all coach profiles or a specific one by ID).

**3. Exact safe-scope files to touch first:**
*   `src/models/CoachProfile.js`: Define the Mongoose/Sequelize schema for `CoachProfile`.
*   `src/services/coachService.js`: Implement functions for `createCoachProfile` and `getCoachProfiles`.
*   `src/api/v1/coachRoutes.js`: Define the Express router for `/api/coaches` endpoints.
*   `src/api/v1/index.js`: Integrate `coachRoutes` into the main API router. (Assuming `src/api/v1/index.js` is the standard aggregation point for API routes; if not, `src/app.js` or `src/server.js` would be the alternative).

**4. Verifier/runtime checks:**
*   **API Test (Create):** Send a `POST` request to `/api/v1/coaches` with a valid `CoachProfile` payload (e.g., `{ "name": "Jane Doe", "bio": "Experienced coach...", "specialties": ["career", "wellness"] }`). Expect a `201 Created` status code and the newly created coach profile object in the response, including a generated ID.
*   **API Test (Retrieve All):** Send