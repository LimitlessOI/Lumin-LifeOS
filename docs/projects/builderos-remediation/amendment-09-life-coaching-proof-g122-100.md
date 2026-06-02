# AMENDMENT_09_LIFE_COACHING: Proof Gap G122-100 - Coach Profile Data Model & Basic Creation

This document outlines the proof for closing gap G122-100, focusing on the foundational data model and initial API endpoint for creating a `Coach` profile within the LifeOS platform.

## 1. Exact Missing Implementation or Proof Gap

The initial data model definition for a `Coach` entity is not yet established in the database schema, nor are the basic API endpoints for creating a `Coach` profile. This gap specifically addresses the foundational data structure and the first API interaction point for a coach, enabling the system to store and retrieve basic coach information.

## 2. Smallest Safe Build Slice to Close It

This build slice will:
*   Define the `Coach` data model (schema) using existing ORM patterns.
*   Implement a service function to handle the creation of a new `Coach` profile.
*   Expose a `POST` endpoint for creating a `Coach` profile.
*   Add a basic integration test to verify the endpoint's functionality.

## 3. Exact Safe-Scope Files to Touch First

*   `src/models/Coach.js` (new file: defines the Coach schema)
*   `src/services/coachService.js` (new file: contains business logic for coach operations)
*   `src/routes/coachRoutes.js` (new file: defines API routes for coaches)
*   `src/app.js` (modification: registers `coachRoutes` with the main application)
*   `src/tests/integration/coach.test.js` (new file: integration tests for coach creation)

## 4. Verifier/Runtime Checks

1.  **API Endpoint Test:**
    *   **Method:** `POST`
    *   **URL:** `/api/v1/coaches`
    *   **Request Body (example):**
        ```json
        {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "bio": "Certified life coach specializing in career development.",
            "specialties": ["career", "leadership"]
        }
        ```
    *   **Expected Outcome:**
        *   HTTP Status Code: `201 Created`
        *   Response Body: A JSON object representing the newly created coach, including a unique `id` and all submitted fields.
        *   Database Verification: A direct query to the database confirms the `Coach` entry exists with the provided data.

2.  **Integration Test Execution:**
    *   Run the test suite: `npm test src/tests/integration/coach.test.js`
    *   **Expected Outcome:** All tests within `coach.test.js` pass successfully, specifically verifying the `POST /api/v1/co