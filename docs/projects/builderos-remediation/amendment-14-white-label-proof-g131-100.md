# Amendment 14 White-Label Proof: G131-100 - Initial Configuration Schema & Retrieval

This document outlines the first build slice for proving the foundational white-label configuration mechanism as per `AMENDMENT_14_WHITE_LABEL.md`. The focus is on defining the configuration structure and implementing a read-only service to retrieve these settings, without impacting existing user features or customer-facing surfaces.

---

### Blueprint Note: Next Smallest Build Slice

1.  **Exact missing implementation or proof gap:**
    The current platform lacks a defined, accessible, and extensible configuration schema for white-label branding elements (e.g., tenant-specific logo URLs, primary colors, application names, footer text). There is no service to retrieve these configurations based on a tenant identifier.

2.  **Smallest safe build slice to close it:**
    Implement a foundational white-label configuration module that:
    *   Defines a default white-label configuration object.
    *   Provides a `getWhiteLabelConfig(tenantId)` function that returns the default configuration. (Future slices will introduce tenant-specific overrides).
    *   This slice focuses purely on data structure definition and default retrieval logic, isolated from UI or persistence layers.

3.  **Exact safe-scope files to touch first:**
    *   `src/config/whiteLabelDefaults.js`: Defines the default white-label configuration object.
    *   `src/services/whiteLabelConfigService.js`: Implements the `getWhiteLabelConfig` function.
    *   `src/services/__tests__/whiteLabelConfigService.test.js`: Unit tests for the new service.

4.  **Verifier/runtime checks:**
    *   **Unit Tests:**
        *   `whiteLabelConfigService.test.js`: Verify that `getWhiteLabelConfig()` without a `tenantId` (or with a non-existent one) returns the exact structure and values defined in `whiteLabelDefaults.js`.
        *   Verify that the returned object is immutable (e.g., using `Object.freeze` or deep cloning on retrieval to prevent accidental modification).
    *   **Integration Test (Manual/Scripted):**
        *   Execute a simple Node.js script that imports `whiteLabelConfigService` and calls `getWhiteLabelConfig()`. Log the output to confirm the structure and values.
        *   Example: `node -e 'import { getWhiteLabelConfig } from "./src/services/whiteLabelConfigService.js"; console.log(getWhiteLabelConfig());'`

5.  **Stop conditions if runtime truth disagrees:**
    *   If `getWhiteLabelConfig()` does not return an object matching the expected schema (e.g., missing `logoUrl`, `primaryColor`, `appName` keys).
    *   If the returned configuration object is mutable, allowing external modification of default settings.
    *   If the service throws an unexpected error during default configuration retrieval.
    *   If the unit tests for `whiteLabelConfigService` fail.