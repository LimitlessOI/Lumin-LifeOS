# Amendment 14 White Label Proof: G10-100 - Dashboard Welcome Message Customization

This document serves as a proof-of-concept and a blueprint note for the next smallest build slice related to Amendment 14, focusing on white-label customization for a specific UI text element: the Dashboard Welcome Message.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The current white-label configuration system lacks a specific, configurable field and associated storage/retrieval mechanism for the `dashboardWelcomeMessage` text. This prevents tenants from customizing the welcome message displayed on their primary dashboard, as outlined in Amendment 14, G10-100.

**2. Smallest Safe Build Slice to Close It:**
Introduce the `dashboardWelcomeMessage` field into the white-label configuration schema, update the database model to persist this field, and expose it via an internal API for CRUD operations. This slice focuses solely on the backend data model and API layer, without touching any frontend UI components.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/config/whiteLabelSchema.js`: Add `dashboardWelcomeMessage` field definition with validation rules (e.g., string, max length).
*   `src/db/models/WhiteLabelConfig.js`: Update the Mongoose/Sequelize model to include `dashboardWelcomeMessage` as a new field.
*   `src/api/internal/services/whiteLabelConfigService.js`: Implement methods to `get`, `set`, and potentially `reset` the `dashboardWelcomeMessage` for a given tenant.
*   `src/api/internal/routes/whiteLabelConfigRoutes.js`: Add or extend an internal API endpoint (e.g., `PUT /internal/white-label/config/:tenantId/dashboardWelcomeMessage`) to expose the service methods.
*   `src/tests/unit/whiteLabelConfigService.test.js`: Add unit tests for the new service methods, covering setting, retrieving, and validation.
*   `src/tests/integration/whiteLabelConfigApi.test.js`: Add integration tests for the new API endpoint.

**4. Verifier/Runtime Checks:**
*   **API Set Verification:** Execute a `PUT` request to `/internal/white-label/config/:tenantId/dashboardWelcomeMessage` with a valid message. Verify the API returns a 200 OK status and the response body indicates success.
*   **Database Persistence Check:** Directly query the database for the specified tenant's `WhiteLabelConfig` entry. Confirm that the `dashboardWelcomeMessage` field contains the value sent via the API.
*   **API Retrieval Verification:** Execute a `GET` request to `/internal/white-label/config/:tenantId/dashboardWelcomeMessage`. Verify the API returns a 200 OK status and the response body contains the exact message previously set.
*   **Schema Validation Check (Negative):** Attempt to set an invalid `dashboardWelcomeMessage` (e.g., exceeding max length, incorrect data type). Verify the API returns a 400 Bad Request status with appropriate validation error messages.
*   **Existing Config Integrity:** Verify that setting `dashboardWelcomeMessage` does not alter or corrupt any other existing white-label configuration fields for the tenant.

**5. Stop Conditions if Runtime Truth Disagrees:**
*