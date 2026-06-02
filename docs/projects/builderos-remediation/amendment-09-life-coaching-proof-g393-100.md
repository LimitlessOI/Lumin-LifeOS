# Amendment 09: Life Coaching - Proof G393-100

## Blueprint Note: Initial LifeCoachingSession Model Definition

This document serves as a proof-closing blueprint note for the initial build slice of Amendment 09, focusing on establishing the foundational data model for Life Coaching sessions.

### 1. Exact Missing Implementation or Proof Gap

The core data model for `LifeCoachingSession` is not yet defined within the LifeOS platform's persistence layer. This gap prevents any further development of coaching session management, scheduling, or tracking features.

### 2. Smallest Safe Build Slice to Close It

Define the Mongoose schema and model for `LifeCoachingSession`. This slice focuses solely on the data structure and its persistence definition, without introducing API endpoints or business logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/models/LifeCoachingSession.js`

### 4. Verifier/Runtime Checks

1.  **File Existence and Export:** Verify that `src/models/LifeCoachingSession.js` exists and successfully exports a Mongoose model named `LifeCoachingSession`.
2.  **Schema Structure:** Confirm the `LifeCoachingSession` schema includes the following fields with appropriate types:
    *   `coachId`: `Schema.Types.ObjectId`, `ref: 'User'`, `required: true`
    *   `coacheeId`: `Schema.Types.ObjectId`, `ref: 'User'`, `required: true`
    *   `startTime`: `Date`, `required: true`
    *   `endTime`: `Date`, `required: true`
    *   `status`: `String`, `enum: ['scheduled', 'completed', 'cancelled', 'rescheduled']`, `default: 'scheduled'`
    *   `notes`: `String`
    *   `createdAt`: `Date`, `default: Date.now`
    *   `updatedAt`: `Date`, `default: Date.now`
3.  **Model Instantiation:** In a test environment, successfully import and instantiate the `LifeCoachingSession` model without schema validation errors for basic valid data.
4.  **Basic Persistence Test (Optional, but recommended for full proof):** Create a new `LifeCoachingSession` instance, save it to the database, and then retrieve it, verifying data integrity.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `src/models/LifeCoachingSession.js` cannot be created or written to the file system.
*   If the file fails to export a valid Mongoose model.
*   If the defined schema is missing any of the required fields (`coachId`, `coacheeId`, `startTime`, `endTime`, `status`).
*   If the data types for critical fields are incorrect (e.g., `startTime` is not a `Date`).
*   If the `status` field does not correctly enforce the specified enum values.
*   If basic