<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G27 100. -->

Blueprint Note: Amendment 09 - Life Coaching Proof G27-100

This note closes the initial proof gap for Amendment 09 by defining the core data interface for `LifeCoachSession`. This establishes the foundational type definition required for subsequent service and API implementations, ensuring type safety and adherence to the blueprint's conceptual model.

The `LifeCoachSession` interface is conceptually defined as follows:

```typescript
interface LifeCoachSession {
  id: string; // Unique identifier for the session
  userId: string; // ID of the user participating in the session
  coachId: string; // ID of the life coach conducting the session
  scheduledStartTime: Date; // Planned start time of the session
  scheduledEndTime: Date; // Planned end time of the session
  actualStartTime?: Date; // Actual start time, if different or recorded
  actualEndTime?: Date; // Actual end time, if different or recorded
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'; // Current status of the session
  notes?: string; // Optional notes or summary from the coach/user
  feedbackId?: string; // Optional ID linking to a feedback record
  createdAt: Date; // Timestamp when the session record was created
  updatedAt: Date; // Timestamp when the session record was last updated
}
```

This definition provides the necessary structure for data persistence, API contracts, and internal service communication related to life coaching sessions. It aligns with the blueprint's requirement for a clear, extensible session model.

---

**Next Blueprint-Backed Build Slice: Implement `LifeCoachSession` Type Definition**

This section outlines the next smallest build slice to progress Amendment 09, focusing on the concrete implementation of the `LifeCoachSession` type.

1.  **Exact missing implementation or proof gap:**
    The concrete TypeScript type definition for `LifeCoachSession` is missing from the codebase. This type is foundational for all subsequent service, API, and data layer implementations related to life coaching sessions.

2.  **Smallest safe build slice to close it:**
    Introduce the `LifeCoachSession` interface into a shared types definition file. This provides the necessary type safety and structure for future development without impacting existing runtime logic.

3.  **Exact safe-scope files to touch first:**
    `src/common/types/life-coaching.ts` (create if not exists, or append to an existing shared types file if appropriate).

4.  **Verifier/runtime checks:**
    -   `tsc --noEmit`: Verify that the project compiles successfully after adding the type definition, ensuring no syntax errors or type conflicts.
    -   `eslint src/common/types/life-coaching.ts`: Ensure the new file adheres to linting standards.
    -   (Optional) Unit test for type export and basic structure using `expectTypeOf` if a type-testing framework is configured.

5.  **Stop conditions if runtime truth disagrees:**
    -   `tsc --noEmit` reports compilation errors directly related to the new `LifeCoachSession` type or unexpected errors in existing files.
    -   `eslint` reports unfixable errors in the new file.
    -   The designated file path `src/common/types/life-coaching.ts` is found to