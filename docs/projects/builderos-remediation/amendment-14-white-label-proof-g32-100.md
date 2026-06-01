Amendment 14: White Label Proof - G32-100: Dynamic Branding Asset Loading - Blueprint Note
Objective
This document outlines the next build slice for implementing dynamic loading and display of tenant-specific branding assets within BuilderOS, following the initial proof of concept.
Proof-Closing Blueprint Note
1. Exact Missing Implementation or Proof Gap
The current proof-of-concept verifies the concept of dynamic branding. The gap is the concrete implementation of the BuilderOS-internal mechanism to:
a. Define and store tenant-specific branding configurations (e.g., logo URLs, color palettes, font choices).
b. Expose these configurations via a BuilderOS-internal API or configuration service.
c. Enable BuilderOS UI components to consume and apply these configurations dynamically.

2. Smallest Safe Build Slice to Close It
Implement a foundational `TenantBrandingService` within BuilderOS that provides a mechanism to retrieve tenant-specific branding configurations. This slice focuses on defining the data structure and a basic retrieval function, initially backed by mock data.

3. Exact Safe-Scope Files to Touch First
- `builderos/src/types/branding.ts`: Define the `TenantBrandingConfig` interface.
- `builderos/src/config/mockBrandingData.ts`: Provide initial mock data for various tenants.
- `builderos/src/config/tenantBrandingService.ts`: Implement a service with a `getBrandingConfig(tenantId: string)` method.

4. Verifier/Runtime Checks
- **Unit Test:** `tenantBrandingService.test.ts` verifies that `getBrandingConfig` returns the correct `TenantBrandingConfig` for known `tenantId`s and a default/null for unknown ones.
- **Integration Test (Manual/Dev):**
    - Start BuilderOS in a development environment.
    - Navigate to an internal BuilderOS page (e.g., `/builderos/settings`).
    - In the browser console, execute `window.BuilderOS.tenantBrandingService.getBrandingConfig('tenant-g32-100')` (assuming global exposure or similar access).
    - Verify the returned object matches the `TenantBrandingConfig` schema and contains expected mock values.

5. Stop Conditions if Runtime Truth Disagrees
- If `tenantBrandingService.getBrandingConfig` throws an error or returns an unexpected type.
- If the returned `TenantBrandingConfig` object is missing critical properties (e.g., `logoUrl`, `primaryColor`).
- If the service consistently returns default or null configurations for known tenant IDs where specific branding is expected.
- If the service's performance for configuration retrieval is unacceptably slow (e.g., >50ms for a local mock data lookup).