to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST endpoints.
*   `services/builder-control-plane-service.js`: A new file will be created to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This adheres to separation of concerns and keeps the route handler lean.
*   (Optional, for robust validation in future passes) `utils/validation.js`: If a shared validation utility exists, it could be extended. For this proof, inline validation within the route handler or service layer is acceptable.

### 4. Verifier/Runtime Checks

To confirm the successful implementation of this build slice:

*   **Route Reachability:**
    *   Send `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect `200 OK` or `201 Created`.
    *   Send `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids` when `canMarkBuildDone` is configured to succeed. Expect `200 OK`.
    *   Send `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids` when `canMarkBuildDone` is configured to fail (simulating health RED). Expect `409 Conflict`.
*   **Payload Integrity:** Verify that the `recordBuildStart` and `recordBuildComplete` functions within `services/builder-control-plane-service.js` receive the expected parameters from the route handlers. This can be done via logging or mock testing.
*   **Service Invocation:** Confirm that `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are called as expected during the respective route executions.
*   **Error Handling:** Test with missing or invalid parameters to ensure appropriate `400 Bad Request` responses (or similar validation errors) are returned before reaching the service layer.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and re-evaluated if any of the following conditions are met:

*   **Route Inaccessibility:** The new `/build/start` or `/build/complete` endpoints return `404 Not Found` or other unexpected HTTP status codes when accessed correctly.
*   **Incorrect Status Codes:** The `/build/complete` endpoint does not return `409 Conflict` when `canMarkBuildDone` indicates a failure, or does not return `200 OK` when it indicates success.
*   **Parameter Mismatch:** The service functions (`recordBuildStart`, `recordBuildComplete`) are invoked with incorrect, missing, or malformed parameters from the route handlers.
*   **Unintended Side Effects:** Any existing functionality within `routes/lifeos-council-builder-routes.js` or other BuilderOS control plane components is disrupted or behaves unexpectedly.
*   **Dependency Failures:** The stubbed service functions cannot be imported or executed due to module resolution issues or syntax errors.