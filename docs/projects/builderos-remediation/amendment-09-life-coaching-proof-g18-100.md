<!-- SYNOPSIS: Amendment 09: Life Coaching Integration - Proof G18-100 -->

# Amendment 09: Life Coaching Integration - Proof G18-100

This document outlines the next smallest blueprint-backed build slice for Amendment 09, focusing on the initial implementation of Coach Profile Management.

---

### Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The foundational data model and API endpoint for creating a `CoachProfile` are missing. This is the initial step for "Coach Profile Management (CRUD)" as defined in Phase 1 of Amendment 09.

**2. Smallest safe build slice to close it:**
Implement the `CoachProfile` data schema and a `POST /api/v1/coach-profiles` endpoint to allow for the creation of new coach profiles. This includes basic input validation.

**3. Exact safe-scope files to touch first:**
-   `src/models/CoachProfile.js`: Define the Mongoose schema for `CoachProfile`.
-   `src/services/coachProfileService.js`: Implement business logic for creating a coach profile.
-   `src/routes/coachProfiles.js`: Define the API route for `POST /api/v1/coach-profiles`.
-   `src/app.js`: Integrate the new `coachProfiles` router.

**4. Verifier/runtime checks:**
-   **Positive Case**: Send a `POST` request to `/api/v1/coach-profiles` with a valid `CoachProfile` payload (e.g., `{ "name": "Jane Doe", "email": "jane.doe@example.com", "specialties": ["career", "leadership"] }`).
    -   Expected: `HTTP 201 Created` response with the newly created `CoachProfile` object, including an `_id`.
    -   Expected: Verify the `CoachProfile` is persisted in the database by querying directly or via a subsequent