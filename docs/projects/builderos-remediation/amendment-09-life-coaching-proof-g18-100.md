# Amendment 09 Life Coaching Proof (G18-100) Remediation

This document serves as a remediation for the OIL verifier rejection of the previous build attempt for Amendment 09 Life Coaching. The prior submission incorrectly provided JavaScript implementation code within a Markdown file, leading to a `ERR_UNKNOWN_FILE_EXTENSION` error during syntax checks. This document now correctly provides the proof-closing blueprint note as required.

The initial build slice, as implemented in the previously submitted code, focused on establishing the foundational API for creating coach profiles.

---

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The primary proof gap identified was the incorrect format of the proof document itself, which led to the verifier rejection. The underlying implementation for creating coach profiles (`POST /api/v1/coach-profiles`) was present but not correctly documented as a proof.

From an implementation perspective, the current system only supports the creation of coach profiles. The next logical and smallest blueprint-backed build slice is to enable the retrieval of these profiles, both individually and as a collection. This is essential for any subsequent UI integration or internal management.

### 2. Smallest Safe Build Slice to Close It

Implement API endpoints and service logic for retrieving coach profiles:
-   `GET /api/v1/coach-profiles`: Retrieve all coach profiles.
-   `GET /api/v1/coach-profiles/:id`: Retrieve a single coach profile by ID.

This slice extends the existing `CoachProfile` model and `coachProfileService` without altering existing functionality or user-facing surfaces, adhering strictly to BuilderOS-only governed loop execution.

### 3. Exact Safe-Scope Files to Touch First

To implement the retrieval functionality, the following files are within safe scope and should be touched first:

-   `src/services/coachProfileService.js`: Add functions `getCoachProfileById` and `getAllCoachProfiles`.
-   `src/routes/coachProfiles.js`: Add `router.get` endpoints for `/api/v1/coach-profiles` and `/api/v1/coach-profiles/:id`.

No modifications are required for `src/models/CoachProfile.js` or `src/app.js` for this specific slice, as the model is already defined and the router is already integrated.

### 4. Verifier/Runtime Checks

Upon deployment of this build slice, the following checks should be performed:

-   **API Endpoint Verification:**
    -   Send a `GET` request to `/api/v1/coach-profiles`. Expected: HTTP 200 OK with an array of coach profile objects (can be empty if no profiles exist).
    -   Create a coach profile via `POST /api/v1/coach-profiles`. Note its `_id`.
    -   Send a `GET` request to `/api/v1/coach-profiles/{coachId}` using the noted `_id`. Expected: HTTP 200 OK with the specific coach profile object.
    -   Send a `GET` request to `/api/v1/coach-profiles/nonExistentId`. Expected: HTTP 404 Not Found or appropriate error response.

-   **Database Interaction Verification:**
    -   Verify that `getCoachProfileById` and `getAllCoachProfiles` functions correctly query the `CoachProfile` collection in the database.
    -   Ensure no sensitive data is exposed beyond what is intended for coach profiles.

### 5. Stop Conditions if Runtime Truth Disagrees

If any of the following conditions are met during runtime verification, the build pass should be stopped:

-   `GET /api/v1/coach-profiles` returns a server error (5xx) or malformed data.
-   `GET /api/v1/coach-profiles/{coachId}` returns incorrect data for an existing ID, or a server error (5xx).
-   `GET /api/v1/coach-profiles/{coachId}` for a non-existent ID returns a 200 OK with an empty or incorrect object instead of a 404.
-   Database queries for retrieval operations fail or cause unexpected side effects.
-   Performance degradation is observed for retrieval operations under load.