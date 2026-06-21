<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G369 100. -->

Amendment 09: Life Coaching - Proof G369-100
This document outlines the next smallest build slice for proving out the core functionality of Amendment 09, focusing on the foundational data model and persistence for a Coaching Session.

1. Exact Missing Implementation or Proof Gap
The core data model for a `CoachingSession` and its basic persistence mechanism are not yet defined or implemented. This gap prevents the creation, storage, and retrieval of coaching session records, which are fundamental to any life coaching feature.

2. Smallest Safe Build Slice to Close It
Define the `CoachingSession` data structure and implement a basic `CoachingSessionRepository` with a `create` method. This establishes the foundational data layer for coaching sessions without introducing complex business logic or apiEPs.

3. Exact Safe-Scope Files to Touch First
-   `src/types/coaching.d.ts`: Define the `CoachingSession` interface with essential fields (e.g., `id: string`, `coachId: string`, `clientId: string`, `startTime: Date`, `endTime: Date`, `status: 'scheduled' | 'completed' | 'cancelled'`, `notes?: string`).
-   `src/repositories/CoachingSessionRepository.ts`: Implement a class `CoachingSessionRepository` with a `create(session: Omit<CoachingSession, 'id'>): Promise<CoachingSession>` method. This method should simulate persistence (e.g., in-memory storage for this slice) and return a new `CoachingSession` with an assigned unique `id`.
-   `src/repositories/index.ts`: Export `CoachingSessionRepository` to make it discoverable within the repository layer.
-   `src/tests/repositories/CoachingSessionRepository.test.ts`: Add a basic unit test to verify the `create` method's functionality, ensuring it accepts input, assigns an ID, and returns a valid `CoachingSession` object.

4. Verifier/Runtime Checks
-   **Unit Test Pass:** The `CoachingSessionRepository.test.ts` suite must pass without errors, specifically confirming that the `create` method successfully processes and returns a `CoachingSession` object.
-   **Type Safety:** Ensure that defining `CoachingSession` in `src/types/coaching.d.ts` does not introduce any type conflicts or errors in existing or newly created files.
-   **Manual Verification (if applicable):** If a simple in-memory store is used, a temporary script can be run to call `CoachingSessionRepository.create` and log the output, confirming the structure and data integrity.

5. Stop Conditions if Runtime Truth Disagrees
-   If `CoachingSessionRepository.create` throws an unhandled exception during execution.
-   If the returned `CoachingSession` object from `create` does not contain a valid, unique `id` or if its properties do not accurately reflect the input data.
-   If the unit tests for `CoachingSessionRepository` fail or exhibit unexpected behavior.
-   If the `CoachingSession` interface definition causes compilation errors or type mismatches in any consuming modules.