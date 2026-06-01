# Amendment 09: Life Coaching - Proof G13-100 Blueprint Note

This note closes the proof gap G13-100, focusing on establishing the foundational data persistence for Life Coaching Sessions.

---

### 1. Exact Missing Implementation or Proof Gap

The exact missing implementation is the establishment of a basic data model and persistence mechanism for a `LifeCoachingSession` record within the LifeOS platform. This gap prevents the storage and retrieval of fundamental session details, which is critical for any subsequent coaching functionality.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Defining the `LifeCoachingSession` domain model.
*   Implementing a dedicated repository for `LifeCoachingSession` entities, including a method to create a new session record.
*   Integrating this new repository into the existing database layer.

### 3. Exact Safe-Scope Files to Touch First

*   `src/domain/life-coaching/models/LifeCoachingSession.js` (Define the session data structure/schema)
*   `src/infra/db/repositories/LifeCoachingSessionRepository.js` (Implement persistence logic for sessions)
*   `src/infra/db/index.js` (Register the new `LifeCoachingSessionRepository` for access)

### 4. Verifier/Runtime Checks

1.  **Data Persistence Check:** Execute a test that calls `LifeCoachingSessionRepository.create()` with valid session data. Verify that the method returns a successfully created session object with an assigned ID.
2.  **Data Retrieval Check:** Immediately after creation, attempt to retrieve the same session using its ID via a `LifeCoachingSessionRepository.findById()` (or similar) method. Verify that the retrieved session's properties (e.g., `coachId`, `clientId`, `startTime`, `durationMinutes`, `status`) exactly match the input data used for creation.
3.  **Error Handling Check:** Attempt to create a session with invalid or missing required data (e.g., null `coachId` if required). Verify that the repository throws an expected validation or database error.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `LifeCoachingSessionRepository.create()` fails to persist a valid session record to the database.
*   If a successfully created session cannot be retrieved with its original data intact.
*   If schema validation or database constraints are not enforced as expected during session creation.
*   If the integration into `src/infra/db/index.js` causes existing database operations to fail or introduces unexpected side effects.