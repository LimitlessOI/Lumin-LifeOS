# Command Center V2 Blueprint Proof: G983-100 - Initial Command Ingestion API

This document outlines the proof for the first build slice of the Command Center V2, focusing on establishing a foundational API endpoint for command ingestion.

---

## Blueprint Note: Initial Command Ingestion API

**1. Exact missing implementation or proof gap:**
The `POST /api/v2/command` endpoint, intended for receiving and acknowledging new commands, is not yet implemented. This endpoint needs to accept a JSON body containing a `command` string and an optional `payload` object.

**2. Smallest safe build slice to close it:**
Implement a new API route handler for `POST /api/v2/command`. This handler will:
    a. Parse the incoming request body to extract `command` and `payload`.
    b. Log the received command and its payload to the server's standard output (or a designated logger).
    c. Return a `200 OK` response with a confirmation message, including the received command.
This slice explicitly avoids database interaction, complex validation, or command execution logic, focusing solely on the ingestion and acknowledgment mechanism.

**3. Exact safe-scope files to touch first:**
*   `src/api/v2/command/post.js` (New file: Contains the handler logic for `POST /api/v2/command`)
*   `src/routes/api.js` (Existing file: Register the new `POST /api/v2/command` route)

**4. Verifier/runtime checks:**
*   **Test Request:** Send a `POST` request to `http://localhost:<PORT>/api/v2/command` with the following JSON body:
    ```json
    {
      "command": "system_status_check",
      "payload": {
        "target": "all",
        "level": "basic"
      }
    }
    ```
*   **Expected API Response:** Verify the API returns a `200 OK` status code and a JSON response similar to:
    ```json
    {
      "status": "received",
      "command": "system_status_check",
      "message": "Command received successfully."
    }
    ```
*   **Server Log Check:** Confirm that the server logs contain an entry indicating the receipt of the command, e.g., `[INFO] Command received: system_status_check with payload: {"target":"all","level":"basic"}`.

**5. Stop conditions if runtime truth disagrees:**
*   If the API returns a `404 Not Found` for `POST /api/v2/command`.
*   If the API returns a `500 Internal Server Error` or any other unexpected status code.
*   If the API response body does not match the expected structure or content.
*   If the server logs do not show the command being received and logged as expected.
*   If the server process crashes or becomes unresponsive after receiving the request.