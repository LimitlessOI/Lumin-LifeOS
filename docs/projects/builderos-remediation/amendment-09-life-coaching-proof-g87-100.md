# Amendment 09: Life Coaching - Proof G87-100: Core Data Model Definition

This document outlines the initial proof-of-concept and the next smallest build slice for integrating Life Coaching features into LifeOS, specifically focusing on the foundational data model.

---

### Blueprint Note: Next Build Slice - Coach Data Model

1.  **Exact missing implementation or proof gap:**
    The foundational database schema definition for `Coach` and `CoachProfile` entities is missing. This is a prerequisite for all subsequent API and UI development related to coach management, as outlined in Phase 1 of the blueprint.

2.  **Smallest safe build slice to close it:**
    Define the ORM models and corresponding database schema for `Coach` and `CoachProfile`. This includes essential fields to represent a coach (e.g., `id`, `userId`, `status`, `createdAt`, `updatedAt`) and their public profile information (e.g., `id`, `coachId`, `bio`, `specialties`, `availability`, `hourlyRate`, `profilePictureUrl`).

3.  **Exact safe-scope files to touch first:**
    *   `src/db/models/Coach.js`
    *   `src/db/models/CoachProfile.js`
    *   (If using a migration system) `src/db/migrations/YYYYMMDDHHMMSS_create_