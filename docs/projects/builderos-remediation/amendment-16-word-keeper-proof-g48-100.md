Amendment 16: Word Keeper - Proof G48-100
Blueprint Note: Next Smallest Build Slice - Create Word Functionality
This note outlines the next smallest, self-contained build slice for the Word Keeper platform, focusing on the core functionality of creating a new word. This slice is designed to be implementation-first, enabling rapid verification and progression to subsequent build passes.
---
1. Exact Missing Implementation or Proof Gap
The fundamental capability to persist a new word for an authenticated user is currently missing. This includes the apiEP, the service layer logic for business rules and data transformation, and the repository interaction for db persistence. Specifically, the `WordKeeperService.createWord` method and its corresponding `POST /api/v1/words` apiEP are the primary gaps.
2. Smallest Safe Build Slice to Close It
This build slice focuses on implementing the complete `createWord` flow, from API request to db persistence.
Scope:
-   API Endpoint: Implement `POST /api/v1/words` to accept new word data.
-   Request Validation: Define and apply a `CreateWordDto` for validating incoming request bodies.
-   Service Layer: Implement `WordKeeperService.createWord` to handle business logic and orchestrate data persistence.
-   Repository Layer: Implement `WordKeeperRepository.saveWord` (or similar) for database interaction.

3. Exact Safe-Scope Files to Touch First
-   `src/api/v1/word-keeper/word-keeper.routes.js`: Define the `POST /api/v1/words` route.
-   `src/api/v1/word-keeper/word-keeper.controller.js`: Implement the controller method for `createWord`.
-   `src/api/v1/word-keeper/dtos/create-word.dto.js`: Define the DTO for request body validation.
-   `src/services/word-keeper/word-keeper.service.js`: Implement the `createWord` method.
-   `src/repositories/word-keeper/word-keeper.repository.js`: Implement the method for persisting word data to the database.
-   `src/models/word.model.js`: (If not already existing) Define the Word data model.

4. Verifier/Runtime Checks
-   **API Functional Test:** Send `POST /api/v1/words` with a valid `CreateWordDto` payload.
    -   Expected: HTTP 201 Created, response body contains the newly created word object with a unique ID.
-   **API Validation Test:** Send `POST /api/v1/words` with an invalid `CreateWordDto` payload (e.g., missing required fields, invalid data types).
    -   Expected: HTTP 400 Bad Request, response body contains validation error details.
-   **Database Persistence Check:** After a successful API call, query the database directly to confirm the word is stored correctly and matches the input.
-   **Authentication/Authorization Check:** Attempt `POST /api/v1/words` without authentication or with insufficient authorization.
    -   Expected: HTTP 401 Unauthorized or 403 Forbidden.

5. Stop Conditions if Runtime Truth Disagrees
-   If `POST /api/v1/words` returns a 4xx status code for valid input.
-   If `POST /api/v1/words` returns a 2xx status code for invalid input.
-   If the created word is not found in the database or its data is corrupted after a successful API call.
-   If the API endpoint is accessible without proper authentication/authorization.
-   If the API response time for `createWord` exceeds 500ms under typical load.