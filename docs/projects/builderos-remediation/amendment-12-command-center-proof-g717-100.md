<!-- SYNOPSIS: Amendment 12 Command Center: Proof G717-100 - BuilderOS Loop Iteration Display -->

# Amendment 12 Command Center: Proof G717-100 - BuilderOS Loop Iteration Display

This proof-closing blueprint note addresses the initial integration step for displaying the BuilderOS loop iteration count within the Command Center, as outlined in `AMENDMENT_12_COMMAND_CENTER.md`. The current verifier rejection was due to an environment misconfiguration attempting to execute a markdown file, not an issue with the content itself. This note focuses on the next actionable implementation slice.

---

### 1. Exact Missing Implementation or Proof Gap

The BuilderOS core successfully tracks the `currentLoopIteration` metric. The missing gap is the secure and standardized exposure of this metric for consumption by the BuilderOS Command Center's data layer. Specifically, the existing `/api/builderos/status` endpoint does not yet include this critical operational metric in its payload.

### 2. Smallest Safe Build Slice to Close It

Augment the existing BuilderOS status API endpoint (`/api/builderos/status`) to include the `currentLoopIteration` value. This slice focuses solely on making the data available from the backend, without touching the Command Center UI or any other consumer logic.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builderos/api/statusController.js`: Modify the controller responsible for the `/api/builderos/status` endpoint to fetch and include `currentLoopIteration` from the BuilderOS core state.
*   `src/builderos/core/loopManager.js`: (Read-only access) Ensure `currentLoopIteration` is accessible from here. (Assuming it's already managed here).
*   `src/builderos/types/builderosStatus.js`: Update the schema/interface definition for the status payload to include `currentLoopIteration: number`. (If such a type definition exists and is enforced).

### 4. Verifier/Runtime Checks

*   **Unit Test:** Add a unit test for `statusController.js` to assert that the `/api/builderos/status` endpoint's response payload contains a `currentLoopIteration` property with a numeric value.
*   **Integration Test:** Deploy to a BuilderOS staging environment. Make a direct `GET` request to `/api/builderos/status`. Verify the JSON response includes `{"currentLoopIteration": <number>}` where `<number>` is a positive integer that increments with each BuilderOS loop cycle.
*   **Manual Check:** Observe the BuilderOS logs for any errors related to the status endpoint after deployment.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `/api/builderos/status` endpoint returns a 5xx error after deployment.
*   If the `currentLoopIteration` field is missing from the response payload.
*   If the `currentLoopIteration` field is present but its value is not a number or does not increment as expected with loop cycles.
*   If the change introduces any regressions in other parts of the `/api/builderos/status` payload or BuilderOS core functionality.

In any of these cases, revert the changes and re-evaluate the data source and serialization logic for `currentLoopIteration`.