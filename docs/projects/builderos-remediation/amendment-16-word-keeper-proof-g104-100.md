<!-- SYNOPSIS: Documentation — Amendment 16 Word Keeper Proof G104 100. -->

Amendment 16 Word Keeper Proof - G104-100
This document outlines the next smallest build slice for the Amendment 16 Word Keeper system, focusing on establishing the foundational write operation.
---
Proof-Closing Blueprint Note
1. Exact Missing Implementation or Proof Gap:
The core apiEP for adding a new word to the Word Keeper system is not yet implemented, specifically the HTTP POST endpoint for `/api/v1/word-keeper/words` and its corresponding service layer function to persist a new word.

2. Smallest Safe Build Slice to Close It:
Implement the `/api/v1/word-keeper/words` POST endpoint to accept a new word object, validate it, and pass it to a `wordKeeperService.addWord` function. The `addWord` function will initially log the word and return a success status, deferring actual persistence to a subsequent slice.

3. Exact Safe-Scope Files to Touch First:
- `src/routes/wordKeeperRoutes.js` (add new POST route)
- `src/services/wordKeeperService.js` (add `addWord` function)
- `src/validation/wordKeeperValidation.js` (define schema for new word payload)

4. Verifier/Runtime Checks:
- **API Endpoint Test:** Send a POST request to `/api/v1/word-keeper/words` with a valid word payload (e.g., `{ "word": "test", "definition": "a test word" }`).
- **Expected Response:** HTTP 201 Created with a confirmation message or the created word object (e.g., `{ "status": "success", "message": "Word received", "word": { "word": "test", "definition": "a test word" } }`).
- **Logging Check:** Verify that the `wordKeeperService.addWord` function logs the received word to the console/logs.
- **Error Handling Test:** Send a POST request with an invalid payload (e.g., missing `word` field) and expect a 400 Bad Request.

5. Stop Conditions if Runtime Truth Disagrees:
- API endpoint returns 404 Not Found.
- API endpoint returns 500 Internal Server Error for valid input.
- API endpoint returns 200 OK but the service function does not log the word.
- API endpoint does not correctly validate input and allows invalid payloads through.
- The service function throws an unhandled exception.