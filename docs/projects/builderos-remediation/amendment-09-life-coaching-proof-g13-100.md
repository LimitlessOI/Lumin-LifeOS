# Amendment 09: Life Coaching - Proof Gap G13-100 Remediation

## Blueprint Note: Proof-Closing for Life Coaching Session Creation

This document addresses the initial proof-of-concept for the `LifeCoachingSession` entity, specifically focusing on its foundational creation mechanism within the LifeOS platform. This is the first build slice for gateway G13, ensuring the core data persistence for coaching sessions is functional.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a verified, internal service-layer function capable of creating a `LifeCoachingSession` record and persisting it to the database. This foundational capability is essential before any higher-level logic (e.g., scheduling, linking to users, status updates) can be built or proven.

### 2. Smallest Safe Build Slice to Close It

Implement a minimal `createSession` function within a new `lifeCoachingService`. This function will accept essential parameters for a `LifeCoachingSession` (e.g., `userId`, `coachId`, `startTime`, `duration`, `status`) and use the existing data access layer to persist this new session record. The focus is solely on successful record creation and persistence, without complex business logic or external API exposure.

### 3. Exact Safe-Scope Files to Touch First

-   `src/models/LifeCoachingSession.js`: Define the Mongoose/Sequelize schema and model for `LifeCoachingSession`.
-   `src/services/lifeCoachingService.js`: Create a new service file containing the `createSession` function.
-   `src/tests/services/lifeCoachingService.test.js`: Add unit tests for the `createSession` function, mocking database interactions.

### 4. Verifier/Runtime Checks

1.  **Unit Test Execution:** Run `src/tests/services/lifeCoachingService.test.js`. All tests for `createSession` must pass, verifying correct input processing and interaction with the mocked data layer.
2.  **Integration Test (Internal Script):** Execute a temporary internal script that directly calls `lifeCoachingService.createSession` with valid data.
    ```javascript
    // Example internal script snippet (not part of production code)
    import { createSession } from '../src/services/lifeCoachingService.js';
    import { LifeCoachingSession } from '../src/models/LifeCoachingSession.js';

    async function verifySessionCreation() {
        const testData = {
            userId: 'user-g13-001',
            coachId: 'coach-g13-001',
            startTime: new Date(),
            durationMinutes: 60,
            status: 'scheduled'
        };
        console.log('Attempting to create session...');
        const newSession = await createSession(testData);
        console.log('Session created:', newSession);

        if (newSession && newSession._id) {
            const retrievedSession = await LifeCoachingSession.findById(newSession._id);
            console.log('Session retrieved from DB:', retrievedSession);
            if (retrievedSession && retrievedSession.userId === testData.userId) {
                console.log('VERIFIER CHECK PASSED: Session created and retrieved successfully.');
            } else {
                console.error('VERIFIER CHECK F