<!-- SYNOPSIS: Amendment 16: Word Keeper - Proof G46-100 -->

# Amendment 16: Word Keeper - Proof G46-100

## Blueprint Note: Proof-Closing Build Slice

This note outlines the next smallest, blueprint-backed build slice for the "Word Keeper" feature, focusing on closing the initial implementation gap.

### 1. Exact Missing Implementation or Proof Gap

The fundamental capability to add a new word to a user's personal word list is currently missing. This includes the necessary API endpoint, the underlying service logic to process the request, and the database model definition and interaction for persistence. Without this core "add" functionality, subsequent features like listing, searching, or removing words cannot be meaningfully developed or tested.

### 2. Smallest Safe Build Slice to Close It

Implement the `POST /api/words` endpoint. This slice will enable authenticated users to submit a new word, which will then be validated and persisted in the database, associated with their user ID. This focuses exclusively on the creation aspect, establishing the foundational data flow and persistence for the Word Keeper feature.

### 3. Exact Safe-Scope Files to Touch First

*   `src/db/schema.prisma`: Define the `Word` model, including `id`, `userId`, `word`, and `timestamp` fields, and establish the relation to the existing `User` model.
*   `src/services/wordService.js`: Create a new service file or extend an existing one to include an `addWord` function. This function will encapsulate the business logic for creating a new word entry, including validation and interaction with the Prisma client.
*   `src/routes/api/words.js`: Define the `POST /api/words` route. This route will handle incoming requests, validate input, call the `wordService.addWord` function, and return an appropriate HTTP response (e.g., `201 Created` on success).
*   `src/routes/index.js` (or similar API router entry point): Ensure the `words.js` router is correctly mounted under `/api`.

### 4. Verifier/Runtime Checks

*   **Successful Word Addition:**
    *   **Action:** Send a `POST` request to `/api/words` with a valid `word` payload (e.g., `{ "word": "testword" }`) while authenticated.
    *   **Expected Outcome:** Receive a `201 Created` HTTP status code. The response body should contain the newly created word object, including its `id`, `userId`, `word`, and `timestamp`.
    *   **Database Verification:** Query the database directly to confirm that the `testword` entry exists in the `Word` table, is correctly linked to the authenticated user's `userId`, and has a valid `timestamp`.

*   **Invalid Input Handling:**
    *   **Action:** Send a `POST` request to `/api/words` with a missing or empty `word` field (e.g., `{}` or `{ "word": "" }`) while authenticated.
    *   **Expected Outcome:** Receive a `400 Bad Request` HTTP status code with a clear error message indicating the input validation failure.

*   **Unauthorized Access:**
    *   **Action:** Send a `POST` request to `/api/words` with a valid `word` payload but without a valid authentication token/session.
    *   **Expected Outcome:** Receive a `401 Unauthorized` or `403 Forbidden` HTTP status code, depending on the existing authentication middleware's behavior.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If a valid `POST /api/words` request does not result in a `201 Created` status and a persisted database entry.
*   If invalid input (e.g., missing `word` field) does not consistently return