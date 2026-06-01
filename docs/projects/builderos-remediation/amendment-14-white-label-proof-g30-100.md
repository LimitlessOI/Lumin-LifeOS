Amendment 14 White-Label Proof: G30-100 - Custom Logo URL Data & API Readiness
This document serves as a proof-closing blueprint note for the initial foundational slice of Amendment 14, focusing on the data model and API readiness for client-specific white-label logo URLs. This addresses a critical prerequisite for dynamic UI branding.
---
1. Exact Missing Implementation or Proof Gap
The current LifeOS platform lacks a defined and queryable data model field and a corresponding read-only apiEP to store and retrieve a client's custom white-label logo URL. This gap prevents the dynamic fetching and application of client-specific branding assets, which is a core requirement of Amendment 14.
2. Smallest Safe Build Slice to Close It
Implement the extension of the existing `Client` data model to include a `whiteLabelLogoUrl` field (string, nullable). Concurrently, create a new read-only API endpoint (e.g., `/api/v1/client/:clientId/whiteLabelLogoUrl`) to expose this field. This endpoint should retrieve the `whiteLabelLogoUrl` for a given `clientId` from the `Client` model. This slice focuses purely on data persistence and retrieval readiness, without immediate UI integration.
3. Exact Safe-Scope Files to Touch First
- `src/models/Client.js`: Add `whiteLabelLogoUrl: { type: String, default: null }` to the Client schema definition.
- `src/routes/clientRoutes.js`: Define a new GET route, e.g., `/api/v1/client/:clientId/whiteLabelLogoUrl`, mapping to a new controller function.
- `src/controllers/clientController.js`: Implement the `getClientWhiteLabelLogoUrl` function to query the `Client` model by `clientId` and return the `whiteLabelLogoUrl` field.
- `src/db/migrations/YYYYMMDDHHMMSS-add-whiteLabelLogoUrl-to-client.js`: Create a database migration script to add the `whiteLabelLogoUrl` column to the `clients` table (if using a relational DB with migrations) or update the schema definition (if using NoSQL with schema enforcement).
4. Verifier/Runtime Checks
- **Unit Tests**:
    - `test/models/Client.test.js`: Verify `Client` model can store and retrieve `whiteLabelLogoUrl`.
    - `test/controllers/clientController.test.js`: Verify the new controller function correctly queries the model and returns the URL.
- **Integration Tests**:
    - `test/routes/clientRoutes.test.js`: Verify the `/api/v1/client/:clientId/whiteLabelLogoUrl` endpoint returns the expected data for valid and invalid `clientId`s.
- **Manual API Verification**:
    - Use `curl` or Postman to `GET /api/v1/client/{existingClientId}/whiteLabelLogoUrl`. Expect a 200 OK with the URL or null.
    - Verify with a non-existent `clientId` returns a 404.
- **Database Inspection**:
    - Confirm the `clients` collection/table schema includes the `whiteLabelLogoUrl` field after migration/deployment.
5. Stop Conditions if Runtime Truth Disagrees
- **API Returns Incorrect Data**: If the API endpoint returns a 404 for an existing client, or returns incorrect `whiteLabelLogoUrl` data, stop and investigate controller/service logic or data seeding.
- **Schema Mismatch**: If database inspection reveals the `whiteLabelLogoUrl` field is missing or has an incorrect type, stop and review migration script or model definition.
- **Performance Degradation**: If adding the field or the new API endpoint introduces noticeable latency or resource consumption, stop and optimize queries/indexing.
- **Security Vulnerability**: If the endpoint exposes sensitive client data beyond the logo URL, or allows unauthorized access, stop immediately and secure the endpoint.