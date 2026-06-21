<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G142 100. -->

Proof-Closing Blueprint Note: Amendment 09 - Life Coaching (G142-100)

This note addresses the next smallest blueprint-backed build slice following the initial definition of the `CoachProfile` schema and basic API routes.

1.  **Exact Missing Implementation or Proof Gap:**
    The basic CRUD apiEPs for `CoachProfile` in `@lifeos/coach-profile-service` currently lack robust input validation for data integrity and essential authorization checks to prevent unauthorized modifications. This gap leaves the API vulnerable to malformed data and security breaches, failing to meet production-grade requirements for data quality and access control.

2.  **Smallest Safe Build Slice to Close It:**
    Implement a dedicated validation layer using a schema validation library (e.g., Joi) for `CoachProfile` creation (`POST /coach-profiles`) and update (`PUT /coach-profiles/:id`) operations. Concurrently, introduce an authorization middleware to verify that update requests are initiated either by the `coachId` associated with the profile or by an authenticated internal service account. This slice focuses solely on enhancing the existing API endpoints without altering their core functionality or introducing new features.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `@lifeos/coach-profile-service/src/api/coachProfileRoutes.js`: Integrate validation and authorization middleware into existing route definitions.
    *   `@lifeos/coach-profile-service/src/validation/coachProfileSchema.js`: (New file) Define Joi schemas for `CoachProfile` creation and update payloads.
    *   `@lifeos/coach-profile-service/src/middleware/authorizationMiddleware.js`: (New file or extend existing) Implement logic for `CoachProfile` ownership/service authorization.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests**:
        *   Verify `coachProfileSchema.js` correctly validates valid payloads and rejects invalid ones (e.g., missing required fields, incorrect data types).
        *   Verify `authorizationMiddleware.js` correctly grants access for authorized users/services and denies for unauthorized attempts.
    *   **Integration Tests**:
        *   Attempt `POST /coach-profiles` with invalid data; assert 400 Bad Request.
        *   Attempt `PUT /coach-profiles/:id` with invalid data; assert 400 Bad Request.
        *   Attempt `PUT /coach-profiles/:id` as an unauthorized user; assert 403 Forbidden.
        *   Attempt `PUT /coach-profiles/:id` as the authorized coach/service; assert 200 OK.
    *   **Manual API Testing**: Use `curl` or Postman to replicate integration test scenarios against a deployed development environment.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If the validation middleware fails to reject clearly invalid `CoachProfile` data.
    *   If the authorization middleware permits unauthorized users or services to modify `CoachProfile` data.
    *   If the introduction of middleware causes regressions or unexpected behavior in other `CoachProfile` API endpoints.
    *   If the service's overall performance significantly degrades.
    *   If the new files or modifications introduce new build failures or linting errors.