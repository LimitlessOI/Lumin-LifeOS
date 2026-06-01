# Amendment 14 White-Label Proof: G71-100 - Initial Tenant Identification & Configuration Loading

This document serves as a proof-closing blueprint note for "Proof-G71-100" within Amendment 14, focusing on the foundational capability for white-labeling: initial tenant identification and the loading of a minimal, hardcoded configuration. This is the smallest safe build slice to establish the core mechanism without touching UI or complex data persistence.

---

## Blueprint Note: Next Smallest Build Slice

**1. Exact Missing Implementation or Proof Gap:**
The system lacks a mechanism to identify a tenant based on an incoming request (e.g., `Host` header) and retrieve a *minimal, hardcoded* white-label configuration for that identified tenant. This gap prevents any subsequent white-label customization.

**2. Smallest Safe Build Slice to Close It:**
Implement a new middleware function that:
    a. Extracts a tenant identifier from the incoming `req.hostname`.
    b. Uses this identifier to look up a corresponding *hardcoded* white-label configuration object.
    c. Attaches the retrieved configuration object to the `req` object (e.g., `req.builderOsTenantConfig`) for downstream use.
This slice focuses purely on request-level tenant identification and configuration injection, avoiding database interactions or UI rendering logic.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/utils/builderOsTenantConfig.js`: New file to house the tenant identification logic and hardcoded configuration map.
*   `src/middleware/builderOsTenantIdentifier.js`: New file for the middleware function that utilizes `builderOsTenantConfig.js`.
*   `src/app.js` (or equivalent main application entry point): Modify to `app.use()` the new `builderOsTenantIdentifier` middleware *before* any routes that might require tenant context. This modification must be scoped to BuilderOS-specific request paths or a very early, non-customer-facing part of the pipeline.

**4. Verifier/Runtime Checks:**
*   **Test Case 1: Known Tenant Hostname**
    *   **Action:** Make an HTTP request to a BuilderOS-scoped endpoint using a known tenant hostname (e.g., `GET /builder-api/status` with `Host: tenantA.localhost:3000`).
    *   **Expected Outcome:** The `req.builderOsTenantConfig` object should be present and contain the hardcoded configuration for `tenantA` (e.g., `{ id: 'tenantA', name: 'Tenant A', primaryColor: '#007bff' }`).
*   **Test Case 2: Unknown Tenant Hostname**
    *   **Action:** Make an HTTP request to a BuilderOS-scoped endpoint using an unknown tenant hostname (e.g., `GET /builder-api/status` with `Host: unknown.localhost:3000`).
    *   **Expected Outcome:** The `req.builderOsTenantConfig` object should be `null` or `undefined`, or contain a predefined default/fallback configuration, indicating no specific tenant was identified.
*   **Test Case 3: No Hostname (Direct IP/Default)**
    *   **Action:** Make an HTTP request to a BuilderOS-scoped endpoint without a specific tenant hostname (e.g., `GET /builder-api/status` with `Host: localhost:3000`).
    *   **Expected Outcome:** Similar to Test Case 2, `req.builderOsTenantConfig` should be `null`/`undefined` or default.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `req.builderOsTenantConfig` is not correctly populated for known tenants as per the hardcoded map.
*   If the application crashes or throws an unhandled error when an unknown or malformed `Host` header is encountered.
*   If the introduction of this middleware causes unintended side