Command Center V2 Blueprint Proof: G399-100 - API Command Listing

This document closes the proof for the initial API implementation slice, specifically focusing on listing commands. It outlines the next smallest build slice to continue progress on the Command Center V2 re-platforming initiative, adhering to the `COMMAND_CENTER_V2_BLUEPRINT.md`.

---

### Next Smallest Blueprint-Backed Build Slice: Retrieve Single Command Details

This build slice focuses on implementing the API endpoint and underlying logic to retrieve the detailed information for a single command by its unique identifier. This directly follows the command listing capability, enabling deeper interaction with individual commands within the BuilderOS Command Center V2.

**1. Exact Missing Implementation or Proof Gap:**
The current API allows listing all available commands. The gap is the ability to fetch the complete details of a *specific* command, including its parameters, description, and execution metadata, using a unique identifier (e.g., `commandId`). This is crucial for command configuration, editing, and detailed inspection within the BuilderOS UI.

**2. Smallest Safe Build Slice to Close It:**
Implement a new BuilderOS API endpoint: `GET /api/builder/commands/:commandId`.
This endpoint will:
*   Accept a `commandId` as a path parameter.
*   Validate the `commandId`.
*   Retrieve the corresponding command details from the underlying data store.
*   Return the command object, or a 404 if not found.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/api/command/routes.js`: Add a new GET route for `/api/builder/commands/:commandId`.
*   `src/builder-os/api/command/controller.js`: Implement a `getCommandById` function to handle the request, call the service layer, and format the response.
*   `src/builder-os/api/command/service.js`: Implement a `findCommandById` function to interact with the data layer (e.g., database, internal registry) to fetch command details.
*   `src/builder-os/api/command/schemas.js` (if applicable): Define validation schema for `commandId` parameter and response body.
*   `tests/builder-os/api/command.test.js`: Add integration and unit tests for the new endpoint and its associated logic.

**4. Verifier/Runtime Checks:**
*   **API Endpoint Test:** `GET /api/builder/commands/{validCommandId}` should return 200 OK with the expected command object.
*   **API Endpoint Test (Not Found):** `GET /api/builder/commands/{nonExistentCommandId}` should return 404 Not Found.
*   **API Endpoint Test (Invalid ID):** `GET /api/builder/commands/{invalidFormatId}` should return 400 Bad Request.
*   **Unit Tests:** Verify `controller.getCommandById` and `service.findCommandById` handle valid/invalid inputs and outputs correctly.
*   **Integration Tests:** Ensure the full stack from route to data retrieval works as expected.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `GET /api/builder/commands/{commandId}` consistently returns 404 for known, existing commands.
*   If the returned command object schema or data is inconsistent with the `COMMAND_CENTER_V2_BLUEPRINT.md` specification for command details.
*   If performance metrics for this endpoint are significantly outside acceptable thresholds (e.g., high latency, excessive resource consumption).
*   If security vulnerabilities are identified (e.g., unauthorized access to command details).