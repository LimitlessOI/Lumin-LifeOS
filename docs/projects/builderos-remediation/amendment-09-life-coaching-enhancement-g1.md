<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Enhancement G1. -->

Builder-Ready Blueprint Enhancement: Amendment 09 - Life Coaching (G1)
This memo outlines the first buildable slice for the Life Coaching Module, focusing on foundational data model definitions without exposing user-facing features.
---
1. Blocking Ambiguity or Founder Decision List
-   CoachProfile.availability: Specific data structure for coach availability (e.g., array of objects with `day`, `startTime`, `endTime`, `timezone`? Or a more complex recurring schedule system?). Decision needed on granularity and recurrence.
-   CoachProfile.specialties: How are specialties defined? Free text, predefined enum, or linked to a taxonomy? Decision needed on source and structure.
-   CoachProfile.pricingModel: Is this per-session, subscription, package-based? What are the units and currency? Decision needed on initial model and extensibility.
-   User.lifeCoachId: Is this a direct foreign key, or is there an intermediary `UserCoachRelationship` table for more complex scenarios (e.g., multiple coaches, historical coaches)? Decision needed on relationship cardinality.
2. Already-Settled Constraints
-   No user-facing features or TSOS customer-facing surfaces are to be modified in this slice.
-   Focus exclusively on foundational data model definitions and db schema updates.
-   BuilderOS-only governed loop execution for this task.
-   The module context is "Life Coaching" (Amendment 09).
3. The Smallest Buildable Next Slice
-   Define the core data model for `CoachProfile` including `id`, `userId` (linking to an existing `User`), `name`, `bio`, `specialties` (as a simple string array for now, pending decision), `pricingModel` (as a simple string for now, pending decision), and `availability` (as a simple string for now, pending decision).
-   Add a `lifeCoachId` field to the existing `User` model, referencing `CoachProfile.id`.
-   Implement necessary db schema migrations for these model changes.
-   No apiEPs, UI components, or business logic beyond data persistence.
4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/db/schemas/CoachProfile.js` (new file, defines the CoachProfile model)
-   `src/db/schemas/User.js` (amend existing file to add `lifeCoachId` field)
-   `src/db/index.js` (amend to export the new `CoachProfile` model)
-   `src/db/migrations/<timestamp>-add-coach-profile-and-link-user.js` (new file, db migration script)
-   `src/types/db.d.ts` (amend to add `CoachProfile` type and update `User` type, if TS is in use)
5. Required Verifier/Runtime Checks
-   Successful execution of the db migration script.
-   `CoachProfile` table exists in the db with expected columns.
-   `User` table has the `lifeCoachId` column.
-   Ability to create and retrieve `CoachProfile` records via the ORM/data layer.
-   Ability to update `User` records with a `lifeCoachId` and retrieve them.
-   No regressions in existing data model functionality or tests.
6. Stop Conditions
-   `CoachProfile` data model is fully defined, implemented, and migrated to the db.
-   `User` data model is updated with the `lifeCoachId` field and migrated.
-   Basic data layer CRUD operations (create, read) for `CoachProfile` are verified.
-   The system remains stable with no new user-facing or TSOS-facing features exposed.
ASSUMPTIONS:
- The project uses a typical Node/ESM structure for db models (e.g., `src/db/schemas`).
- Database migrations are managed via scripts (e.g., `src/db/migrations`).
- TS type definitions are maintained for data models (e.g., `src/types/db.d.ts`) as part of "production-quality" code.