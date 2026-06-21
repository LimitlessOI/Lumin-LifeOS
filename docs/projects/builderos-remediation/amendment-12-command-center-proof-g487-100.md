<!-- SYNOPSIS: Amendment 12 Command Center Proof: G487-100 - Initial Task Management Backend -->

# Amendment 12 Command Center Proof: G487-100 - Initial Task Management Backend

This document outlines the next smallest build slice for the BuilderOS Command Center, focusing on establishing the foundational backend for Task Management as described in `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.

---

### Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The `AMENDMENT_12_COMMAND_CENTER.md` blueprint specifies "Task Management" as a key feature but lacks concrete implementation details for the backend data model and initial API endpoints required to view BuilderOS tasks. Specifically, the `BuilderOSTask` data structure definition and the `GET /api/builderos/tasks` and `GET /api/builderos/tasks/:id` API routes are not yet implemented.

2.  **Smallest safe build slice to close it:**
    Define the `BuilderOSTask` data model (schema and TypeScript interface) and implement the `GET /api/builderos/tasks` endpoint to retrieve a list of BuilderOS tasks, and the `GET /api/builderos/tasks/:id` endpoint to retrieve a single BuilderOS task by its ID. This establishes the core backend visibility for BuilderOS tasks, enabling subsequent frontend development.

3.  **Exact safe-scope files to touch first:**
    -   `src/types/builderos.ts`: Define the `BuilderOSTask` TypeScript interface.
    -   `src/db/schema.ts`: Add the database schema definition for `BuilderOSTask` (e.g., using an ORM like Prisma or raw SQL migration).
    -   `src/services/builderos/taskService.ts`: Implement functions for fetching tasks from the database.
    -   `src/routes/builderos/tasks.ts`: Define and register the `GET /api/builderos/tasks` and `GET /api/builderos/tasks/:id` API routes, utilizing the `taskService`.
    -   `src/routes/index.ts`: Register the new `builderos/tasks` router.

4.  **Verifier/runtime checks:**
    -   **API Endpoint Test 1 (List Tasks):**
        -   **Method:** `GET`
        -   **URL:** `/api/builderos/tasks`
        -   **Expected Status:** `200 OK`
        -   **Expected Body:** An array of `BuilderOSTask` objects (initially empty or containing mock data).
        -   **Verification:** Confirm the response is a JSON array and each item conforms to the `BuilderOSTask` interface.
    -