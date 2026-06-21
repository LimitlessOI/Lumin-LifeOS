<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G743 100. -->

Amendment 14 White-Label Proof - G743-100

This document serves as a proof-closing blueprint note for Amendment 14, focusing on the initial white-label implementation verification.

1.  **Exact Missing Implementation or Proof Gap**
    The core gap identified for this build slice is the lack of a verified mechanism to dynamically apply tenant-specific branding, specifically the loading and application of a tenant's primary logo within the BuilderOS administrative interface. While branding assets may be stored, the runtime system does not yet reliably fetch and render the correct logo based on the active tenant context. This prevents the visual confirmation of white-label tenancy.

2.  **Smallest Safe Build Slice to Close It**
    Implement a `BrandingService` to retrieve the tenant's primary logo URL and integrate it into a single, high-level BuilderOS UI component (e.g., the main header or a dedicated branding display component). This slice focuses solely on the logo URL retrieval and display, avoiding complex theming, CSS variable injection, or other branding elements for now. The goal is to establish the foundational pattern for dynamic branding application.

3.  **Exact Safe-Scope Files to Touch First**
    *   `src/builder-os/services/BrandingService.js`: (New file) Service to encapsulate branding logic, including fetching tenant-specific logo URLs.
    *   `src/builder-os/config/branding-defaults.js`: (New file) Configuration for default branding assets and a mapping mechanism for tenant-specific overrides.
    *   `src/builder-os/components/Header.js`: (Existing file) Modify to import and utilize `BrandingService` to display the tenant's primary logo.
    *   `src/builder-os/utils/tenantContext.js`: (Existing file, if available, otherwise create a minimal stub) Utility to provide the current tenant ID to `BrandingService`.

4.  **Verifier/Runtime Checks**
    *   **Unit Test (`BrandingService.test.js`):** Verify that `BrandingService` correctly returns logo URLs for various simulated tenant contexts (e.g., known white-label tenant, default tenant).
    *   **Integration Test (`Header.test.js`):** Ensure the `Header` component correctly renders an `<img>` tag with the expected `src` attribute when provided with a tenant context.
    *   **E2E Test (BuilderOS UI):** Log in as a designated white-label tenant in a staging environment. Verify that the BuilderOS header displays the correct tenant-specific logo image (check `<img>` tag `src` attribute in DOM).
    *   **Network Inspection:** Confirm that the browser makes a network request for the expected logo asset URL.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If the logo displayed in the BuilderOS header is incorrect for the active tenant.
    *   If no logo is displayed where a tenant-specific or default logo is expected.
    *   If the application crashes or throws runtime errors related to branding asset loading or `BrandingService` invocation.
    *   If `BrandingService` fails to return a valid logo URL for a known, configured tenant.
    *   If the implementation introduces regressions or breaks existing BuilderOS UI functionality.