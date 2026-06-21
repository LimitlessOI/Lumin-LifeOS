<!-- SYNOPSIS: Amendment 09 Life Coaching - Proof G24-100: Core Session Data Model -->

# Amendment 09 Life Coaching - Proof G24-100: Core Session Data Model

This document outlines the first proof-closing build slice for Amendment 09, focusing on establishing the foundational data model for coaching sessions within LifeOS. This slice aims to define the core structure for a coaching session, enabling future development of scheduling, logging, and progress tracking.

## 1. Exact Missing Implementation or Proof Gap

The current LifeOS platform lacks a defined data model and persistence mechanism for "Coaching Sessions." This gap prevents the storage and retrieval of essential session metadata, which is critical for all subsequent life coaching features (scheduling, logging, progress tracking, billing, etc.).

## 2. Smallest Safe Build Slice to Close It

Define and implement the core `CoachingSession` data model, including its schema and a basic repository/service layer for creation and retrieval. This slice focuses purely on data persistence and does not include any user-facing UI or complex business logic beyond basic CRUD operations for the session entity.

## 3. Exact Safe-Scope Files to Touch First

*   `src/domain/coaching/CoachingSession.js`: Define the `CoachingSession` entity/schema.
*   `src/infra/db/repositories/CoachingSessionRepository.js`: Implement basic CRUD operations for `CoachingSession`.
*   `src/application/services/CoachingService.js`: Expose basic session creation/retrieval methods.
*   `src/interfaces/http/routes/coaching.js`: Add a minimal internal API route (e.g., `/api/internal/coaching/sessions`) for testing session creation/retrieval.
*   `src/interfaces/http/routes/index.js`: Register the new `coaching.js` route.
*   `tests/integration/coachingSession.test.js`: Add integration tests