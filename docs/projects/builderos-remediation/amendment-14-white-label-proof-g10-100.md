# Amendment 14: White Label Proof - G10-100

## Overview
This document serves as a proof point for Amendment 14, focusing on the foundational capabilities for white-labeling the LifeOS platform. Specifically, G10-100 addresses the establishment of the core white-label configuration management and retrieval mechanisms within the BuilderOS domain. This proof outlines the conceptual design and initial API contract for managing and retrieving white-label specific configurations.

## Proof Scope (G10-100)
The scope of this proof point is limited to:
1.  **Conceptual Design:** Outline the high-level architecture for storing and retrieving white-label configurations.
2.  **Data Model Definition:** Define a minimal schema for white-label configuration data (e.g., `brandName`, `logoUrl`, `primaryColor`).
3.  **API Contract (Internal BuilderOS):** Propose an internal BuilderOS API endpoint for retrieving white-label configurations based on a tenant or instance identifier.
4.  **Security Considerations:** Briefly touch upon access control for configuration data.

This proof does *not* include:
*   Full implementation of the configuration service.
*   Database schema or ORM integration.
*   User interface for configuration management.
*   Integration with LifeOS user features or TSOS customer-facing surfaces.

## Proposed Mechanism
### Configuration Storage
White-label configurations will be stored in a dedicated BuilderOS-internal data store. Each configuration will be associated with a unique identifier, likely derived from the BuilderOS instance or tenant ID.

### Retrieval Endpoint (Internal)
An internal BuilderOS API endpoint will be exposed to allow other BuilderOS components to retrieve white-label configurations.

**Endpoint Example:**
`GET /builder-os/api/v1/white-label/config/:instanceId`

**Response Example (JSON):**
```json
{
  "instanceId": "g10-100-instance-alpha",
  "brandName": "Alpha Brand",
  "logoUrl": "https://cdn.example.com/alpha-logo.png",
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d"
}
```

### Security
Access to this internal API will be restricted to authenticated BuilderOS services only, utilizing existing internal authentication mechanisms.

## Proof Conclusion
G10-100 establishes the conceptual framework and internal API contract for white-label configuration management and retrieval within BuilderOS. This foundational work enables subsequent implementation phases for actual data persistence and service integration.

---

## Blueprint Note: Next Smallest Build Slice for G10-100

**1. Exact missing implementation or proof gap:**
The current proof document (`amendment-14-white-label-proof-g10-100.md`) defines the conceptual design and internal API contract for white-label configuration retrieval. The immediate gap is the *minimal viable implementation* of this internal API endpoint and its backing service within BuilderOS. This includes defining the data structure, a mock or placeholder data source, and exposing the endpoint.

**2. Smallest safe build slice to close it:**
Implement a new internal BuilderOS service and API route that provides a default or mock white-label configuration when queried by an `instanceId`. This slice will focus solely on the retrieval mechanism, without persistent storage integration or complex business logic.

**3. Exact safe-scope files to touch first:**
*   `src/builder-os/services/whiteLabelConfigService.js` (New file: Implements the logic to retrieve config, initially returning mock data)
*   `src/builder-os/routes/whiteLabelConfigRoutes.js` (New file: Defines the `GET /builder-os/api/v1/white-label/config/:instanceId` route)
*   `src/builder-os/index.js` (or equivalent main entry point: Register the new `whiteLabelConfigRoutes`)
*   `src/builder-os/tests/unit/whiteLabelConfigService.test.js` (New file: Unit tests for the service)
*   `src/builder-os/tests/integration/whiteLabelConfigRoutes.test.js` (New file: Integration tests for the API route)

**4. Verifier/runtime checks:**
*   **Unit Tests:** `npm test src/builder-os/services/whiteLabelConfigService.test.js` should pass, verifying the service returns expected mock data for various `instanceId` inputs.
*   **Integration Tests:** `npm test src/builder-os/tests/integration/whiteLabelConfigRoutes.test.js` should pass, verifying the API endpoint responds with a 200 OK and the expected JSON structure for a given `instanceId`.
*   **Manual API Call (Dev/Staging):** Use `curl` or a similar tool to `GET /builder-os/api/v1/white-label/config/test-instance-id` and confirm the expected mock JSON response.
*   **No Regression:** Ensure existing BuilderOS functionalities and tests remain unaffected.
*   **Scope Adherence:** Verify no changes were introduced to LifeOS user features or TSOS customer-facing surfaces.

**5. Stop conditions if runtime truth disagrees:**
*