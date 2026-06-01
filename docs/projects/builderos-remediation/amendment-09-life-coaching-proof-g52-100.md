# Amendment 09: Life Coaching - Proof G52-100

## Blueprint Note: Initial LifeCoach Entity & Creation API

This note closes the proof gap for the foundational `LifeCoach` entity definition and its initial persistence mechanism, directly supporting the "Coach profile creation" aspect of Phase 1 (MVP) as outlined in `AMENDMENT_09_LIFE_COACHING.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The core data model for the `LifeCoach` entity and a basic API endpoint to create new `LifeCoach` profiles are missing. This is the absolute prerequisite for any coach-related functionality, including profile creation and subsequent scheduling.

### 2. Smallest Safe Build Slice to Close It

Define the `LifeCoach` Mongoose schema and implement a `POST /api/lifecoaches` endpoint to allow for the creation of new `LifeCoach` profiles. This slice focuses solely on the data structure and the initial persistence of a coach record, without delving into complex business logic, authentication, or advanced profile features.

### 3. Exact Safe-Scope Files to Touch First

-   `src/models/LifeCoach.js`: Create a new Mongoose schema file for the `LifeCoach` entity.
-   `src/controllers/lifeCoachController.js`: Create a new controller file containing the `createLifeCoach` function.
-   `src/routes/lifeCoachRoutes.js`: Create a new routes file to define the `POST /api/lifecoaches` endpoint, linking to `createLifeCoach`.
-   `src/app.js` (or `src/