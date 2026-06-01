# Amendment 14 White-Label Proof: G19-100 - Core Configuration Loading

**Blueprint Reference:** `docs/projects/AMENDMENT_14_WHITE_LABEL.md`

**Proof Goal:** This proof-of-concept (G19-100) validates the foundational mechanism for loading white-label configurations. Specifically, it targets the ability to define and retrieve basic tenant-specific branding elements (`appName`, `logoUrl`) from a persistent store. This establishes the core data model and retrieval pattern without engaging frontend rendering or complex domain mapping at this stage.

---

## Blueprint Note: Next Smallest Build Slice

**1. Exact Missing Implementation or Proof Gap:**
The current platform lacks a dedicated data model and retrieval service for tenant-specific white-label configurations. The immediate gap is to define a schema for `WhiteLabelConfig` (minimal: `tenantId`, `appName`, `logoUrl`) and implement a service function to fetch this configuration based on `tenantId`.

**2. Smallest Safe Build Slice to Close It:**
Implement the `WhiteLabelConfig` data model and a `getWhiteLabelConfigByTenantId` function within a new or existing configuration service. This slice focuses purely on data definition and backend retrieval, isolated from API endpoints or UI consumption.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/config/whiteLabelConfig.model.js` (New file: Defines the schema/model for white-label configurations)
*   `src/services/whiteLabelConfig.service.js` (New file: Contains `getWhiteLabelConfigByTenantId` function)
*   `src/db/schemas/whiteLabelConfig.schema.js` (New file: If using a schema-based DB like Mongoose)
*   `src/db/index.js` (Modification: Register the new schema/model)

**4. Verifier/Runtime Checks:**
*   **Unit Test:** Write a unit test for `whiteLabelConfig.service.js` that:
    *   Mocks the database interaction.
    *   Asserts that `getWhiteLabelConfigByTenantId('tenant-123')` returns a predefined `WhiteLabelConfig` object with `appName` and `logoUrl`.
    *   Asserts that `getWhiteLabelConfigByTenantId('non-existent-tenant')` returns `null` or a default configuration.
*   **Integration Test (Manual/Local):** After deployment to a dev environment, use a database client to insert a sample `WhiteLabelConfig` for a known `tenant