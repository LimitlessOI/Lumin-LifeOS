# Amendment 14: White-Label Proof G20-100

## Proof Point: Tenant G20 White-Label Configuration Enabled

This document serves as proof for the successful enablement and storage of white-label configuration for Tenant G20, as per `AMENDMENT_14_WHITE_LABEL.md`. The core configuration for branding elements (e.g., `logoUrl`, `primaryColor`) for Tenant G20 has been defined, persisted, and is retrievable via the `whiteLabelService`. This establishes the foundational data layer for applying white-label customizations.

---

## Proof-Closing Blueprint Note: Next Build Slice

This note outlines the next smallest, safest build slice to advance the white-label implementation for Tenant G20, focusing on visual application of the configured data.

1.  **Exact missing implementation or proof gap:** The configured `logoUrl` for Tenant G20 is not yet dynamically applied to any user-facing component. The immediate gap is to display the custom logo on the login page for Tenant G20.

2.  **Smallest safe build slice to close it:** Implement dynamic loading and display of the tenant-specific white-label logo on the `LoginPage` component. This slice focuses solely on fetching the `logoUrl` from the `whiteLabelService` based on the current tenant context and rendering it in place of the default logo.

3.  **Exact safe-scope files to touch first:**
    *   `apps/web/src/pages/login/LoginPage.tsx`: Modify to fetch and display the tenant-specific logo.
    *   `packages/tenant-config/src/whiteLabelService.ts`: Ensure a public method exists to retrieve the `logoUrl` for a given tenant ID.
    *   `packages/tenant-config/src/types.ts`: Verify `WhiteLabelConfig` interface includes `logoUrl: string;`.

4.  **Verifier/runtime checks:**
    *   **Positive Case (Tenant G20):**
        *   Access the login page for Tenant G20 (e.g., via `g20.lifeos.com/login`).
        *   Verify that the custom logo configured for G20 (e.g., `https://assets.g20.com/logo.png`) is displayed in the header.
        *   Inspect network requests to confirm the `logoUrl` is fetched from the `whiteLabelService` or a related API endpoint.
    *   **Negative Case (Default Tenant):**
        *   Access the login page for a default LifeOS tenant (e.g., `app.lifeos.com/login`).
        *   Verify that the standard LifeOS logo is displayed, and no G20-specific logo appears.
    *   **Error Handling:**
        *   If `logoUrl` is null or empty for G20, ensure the default LifeOS logo is displayed gracefully.

5.  **Stop conditions if runtime truth disagrees:**
    *   The login page fails to render or throws a runtime error.
    *   The incorrect logo (e.g., default LifeOS logo) is displayed for Tenant G20.
    *   The custom G20 logo is displayed for a non-G20 tenant.
    *   Significant performance degradation (e.g., increased page load time by >500ms) on the login page.
    *   The logo image is broken or fails to load, indicating an incorrect URL or asset path.