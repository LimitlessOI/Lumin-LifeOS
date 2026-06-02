Amendment 12 Command Center Proof: G778-100 - Command Reception Endpoint Proof
This proof-closing blueprint note addresses the initial implementation slice for the Amendment 12 Command Center, focusing on establishing the foundational command reception mechanism.
---
1. Exact Missing Implementation or Proof Gap:
The core gap is the absence of a dedicated, authenticated apiEP within BuilderOS to receive and acknowledge commands for the Command Center. This endpoint is crucial for external systems (e.g., BuilderOS orchestrators) to issue instructions.
2. Smallest Safe Build Slice to Close It:
Implement a minimal `POST /builderos/command` apiEP. This endpoint will:
-   Accept a JSON payload representing a command.
-   Perform basic schema validation on the incoming command.
-   Generate a unique `commandId`.
-   Return a `200 OK` response with an acknowledgment payload including the `commandId` and a `status: "received"`.
   Crucially, this slice does not* implement command execution, queuing, or complex state management beyond immediate acknowledgment. It proves the communication channel.
3. Exact Safe-Scope Files to Touch First:
-   `src/api/builderos/command.js`: New file for the command reception handler and route definition.
-   `src/api/builderos/index.js`: Update to register the new `/command` route.
-   `src/api/index.js`: Verify `builderos` router is correctly mounted.
-   `src/types/builderos.d.ts`: Define the TS interface for the incoming command payload and the acknowledgment response.
-   `src/schemas/builderos/command.js`: New file for Joi/Zod schema definition for command validation.
4. Verifier/Runtime Checks:
-   API Reachability & Acknowledgment:
        curl -X POST -H "Content-Type: application/json" \
         -d '{"commandType": "NOOP", "targetId": "self", "payload": {}}' \
         http://localhost:3000/builderos/command
        Expected Result: `HTTP 200 OK` with a JSON body like `{"status": "received", "commandId": "uuid-v4-string"}`.
-   Schema Validation (Invalid Payload):
        curl -X POST -H "Content-Type: application/json" \
         -d '{"invalidField": "value"}' \
         http://localhost:3000/builderos/command
        Expected Result: `HTTP 400 Bad Request` with a validation error message.
-   Unit Tests: Ensure `src/api/builderos/command.js` has unit tests covering valid and invalid command payloads, and correct response generation.
5. Stop Conditions if Runtime Truth Disagrees:
-   If the `POST /builderos/command` endpoint returns `4xx` or `5xx` for valid, well-formed requests.
-   If the endpoint is unreachable or returns `404 Not Found`.
-   If the response payload for a valid request does not contain `status: "received"` and a `commandId`.
-   If invalid payloads are accepted without returning a `400 Bad Request`.
-   If the new files cannot be integrated into the existing API routing structure without breaking existing BuilderOS routes.