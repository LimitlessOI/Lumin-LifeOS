Amendment 09: Life Coaching - Proof G46-100
Proof-Closing Blueprint Note
This note addresses the initial foundational build slice for the `LifeCoach` entity as outlined in `docs/projects/AMENDMENT_09_LIFE_COACHING.md`.
1. Exact Missing Implementation or Proof Gap
The blueprint defines the `LifeCoach` entity structure. The immediate gap is the concrete implementation of this entity's data model and its persistence layer (repository) to allow for basic creation and retrieval. This is a prerequisite for any service logic or API exposure.
2. Smallest Safe Build Slice to Close It
Implement the `LifeCoach` data model (e.g., Mongoose schema) and a basic `LifeCoachRepository` with `create` and `findById` methods. This establishes the core data persistence for `LifeCoach` entities.
3. Exact Safe-Scope Files to Touch First
-   `src/entities/LifeCoach.js`: Define the `LifeCoach` data model/schema.
-   `src/repositories/LifeCoachRepository.js`: Implement basic `create` and `findById` methods for `LifeCoach`.
4. Verifier/Runtime Checks
-   Unit Test `LifeCoachRepository.create()`:
-   Call `LifeCoachRepository.create({ name: 'Coach A', specialization: ['Wellness'], availability: [], rate: 100 })`.
-   Assert that a `LifeCoach` object is returned with a valid ID and matching input properties.
-   Assert that the created entity can be found in the db.
-   Unit Test `LifeCoachRepository.findById()`:
-   Create a `LifeCoach` using `create()`.
-   Call `LifeCoachRepository.findById(createdCoach.id)`.
-   Assert that the retrieved `LifeCoach` object matches the initially created one.
-   Test `findById` with a non-existent ID, asserting `null` or `undefined` is returned.
-   Schema Validation: Ensure that attempts to create a `LifeCoach` with invalid data (e.g., missing `name`, non-numeric `rate`) result in appropriate validation errors.
5. Stop Conditions if Runtime Truth Disagrees
-   `LifeCoachRepository.create()` fails to persist data or returns an improperly structured object.
-   `LifeCoachRepository.findById()` cannot retrieve a previously created entity or returns incorrect data.
-   Schema validation rules are not enforced, allowing invalid `LifeCoach` data to be persisted.
-   Database connection errors prevent any repository operation.