<!-- SYNOPSIS: Proof: Amendment 09 Life Coaching - Goal Template Definition (g29-100) -->

# Proof: Amendment 09 Life Coaching - Goal Template Definition (g29-100)

## Context
This document serves as proof for the successful implementation and verification of the foundational data model and API endpoint for defining generic coaching goal templates, as outlined in Amendment 09 Life Coaching, specifically milestone g29-100. This milestone establishes the core structure for various coaching goals that can later be instantiated by users.

## Implementation Details
The following components were implemented and verified:
*   **Database Schema**: A new Mongoose schema `GoalTemplate` was created to define the structure of a generic coaching goal. This includes fields such as `name`, `description`, `category`, `defaultDurationDays`, and `milestones` (an array of sub-tasks/checkpoints).
*   **API Endpoint**: A new API endpoint `POST /api/coaching/goal-templates` was implemented to allow authorized administrators to create new goal templates. A corresponding `GET /api/coaching/goal-templates` endpoint was also implemented to retrieve existing templates.

## Verification
Verification was performed through a combination of unit tests and integration tests:

1.  **Unit Tests (`src/db/models/GoalTemplate.test.js`)**:
    *   Confirmed `GoalTemplate` model validates required fields (`name`, `category`).
    *   Confirmed `GoalTemplate` model correctly handles optional fields (`description`, `defaultDurationDays`, `milestones`).
    *   Confirmed schema integrity and data types.

2.  **Integration Tests (`src/api/coaching/goal-templates.test.js`)**:
    *   **`POST /api/coaching/goal-templates`**:
        *   Sent a valid payload to create a new goal template. Verified a `201 Created` response and that the template was persisted in the database with correct data.
        *   Sent an invalid payload (e.g