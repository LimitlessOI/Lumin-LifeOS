Amendment 09: Life Coaching - Proof G87-100: Core Data Model Definition
This document outlines the initial proof-of-concept and the next smallest build slice for integrating Life Coaching features into LifeOS, specifically focusing on the foundational data model.
---
Blueprint Note: Next Build Slice - Coach Data Model
1.  Exact missing implementation or proof gap:
    The foundational db schema definition for `Coach` and `CoachProfile` entities is missing. This is a prerequisite for all subsequent API and UI development related to coach management, as outlined in Phase 1 of the blueprint.
2.  Smallest safe build slice to close it:
    Define the ORM models and corresponding db schema for `Coach` and `CoachProfile`. This includes essential fields to represent a coach (e.g., `id`, `userId`, `status`, `createdAt`, `updatedAt`) and their public profile information (e.g., `id`, `coachId`, `bio`, `specialties`, `availability`, `hourlyRate`, `profilePictureUrl`).
3.  Exact safe-scope files to touch first:
-   `src/db/models/Coach.js`
-   `src/db/models/CoachProfile.js`
-   (If using a migration system) `src/db/migrations/YYYYMMDDHHMMSS_create_coaches_and_coach_profiles.js`
4.  Verifier/runtime checks:
-   Database schema introspection: Verify `coaches` and `coach_profiles` tables exist with all specified columns and correct data types.
-   ORM model instantiation: Successfully create instances of `Coach` and `CoachProfile` models.
-   Basic CRUD operations: Perform a create and read operation for both `Coach` and `CoachProfile` via the ORM to confirm data persistence and retrieval.
-   Unit tests: Ensure dedicated unit tests for `Coach` and `CoachProfile` models pass, covering field validation and basic interactions.
5.  Stop conditions if runtime truth disagrees:
-   If database tables or columns are not created or are incorrectly defined after migration, stop and debug the migration script or ORM schema definitions.
-   If ORM model instantiation fails or basic CRUD operations (create/read) result in errors or unexpected data, stop and investigate model definitions, database connection, or ORM configuration.
-   If unit tests for the `Coach` or `CoachProfile` models fail, stop and correct the model implementation or test logic.