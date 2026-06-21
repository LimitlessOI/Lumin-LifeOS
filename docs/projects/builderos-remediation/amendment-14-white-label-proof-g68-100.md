<!-- SYNOPSIS: Amendment 14: White Label Proof - G68-100 -->

# Amendment 14: White Label Proof - G68-100

## Goal
Prove white-label capabilities for G68-100 within the BuilderOS platform. This proof focuses on BuilderOS's ability to manage and apply white-label configurations for provisioned tenants, without impacting LifeOS user features or TSOS customer-facing surfaces directly during this phase.

## Scope
BuilderOS-only governed loop execution. Do not modify LifeOS user features or TSOS customer-facing surfaces. Implement exactly what the instruction asks for inside approved builder safe scope.

## Proof Steps
1.  **Initial Setup:** Ensure BuilderOS can provision a new tenant with white-label settings.
2.  **Configuration Injection:** Verify BuilderOS can inject white-label configuration (e.g., branding, domain) into the provisioned tenant's environment.
3.  **Runtime Verification:** Confirm the provisioned tenant *actually* uses the white-label settings at runtime (e.g., custom domain resolves, branding assets load).
4.  **Teardown:** BuilderOS can safely de-provision the tenant.

## Success Criteria
All proof steps execute successfully without manual intervention, demonstrating BuilderOS's end-to-end capability for white-label tenant management.

## Dependencies
*   BuilderOS tenant provisioning module
*   BuilderOS configuration management
*   TSOS runtime environment (for verification)

---

## Proof-Closing Blueprint Note (G68-100)

This note derives the next smallest blueprint-backed build slice to progress Amendment 14.

1.  **Exact missing implementation or proof gap:**
    The current gap is the lack of explicit support within BuilderOS's tenant provisioning mechanism to accept and internally represent white-label specific configuration parameters during the initial tenant setup. This prevents the first proof step ("Initial Setup") from being fully verifiable.

2.  **Smallest safe build slice to close it:**
    Extend the BuilderOS tenant provisioning request schema and service layer to accept and validate white-label configuration parameters. This slice focuses on data ingress and initial internal representation, not the downstream application of these settings.

3.  **Exact safe-scope files to touch first:**
    *   `services/builder-os/src/tenant-provisioning/schemas/provisionTenantRequest.js`
    *   `services/builder-os/src/tenant-provisioning/provisionTenantService.js`
    *   `services/builder-os/src/tenant-provisioning/tests/provisionTenantService.test.js`

4.  **Verifier/runtime checks:**
    *   Submit a `POST /builder-os/v1/tenants/provision` request with a payload including new fields like `whiteLabelConfig: { enabled: true, customDomain: "example.com", branding: { logoUrl: "...", primaryColor: "..." } }`.
    *   Verify the BuilderOS API accepts the request without schema validation errors related to the new white-label fields.
    *   Inspect BuilderOS service logs to confirm that `provisionTenantService` receives and logs (or stores in a temporary internal structure) the `whiteLabelConfig` object correctly.
    *   Run existing `provisionTenantService.test.js` tests to ensure no regressions.
    *   Add a new test case in `provisionTenantService.test.js` specifically for provisioning a tenant with `whiteLabelConfig` to assert correct schema validation and data handling.

5.  **Stop conditions if runtime truth disagrees:**
    *   If the BuilderOS API rejects the `provisionTenant` request due to unknown or invalid `whiteLabelConfig` fields.
    *   If `provisionTenantService` fails to parse, validate, or internally represent the `whiteLabelConfig` data.
    *   If existing tenant provisioning functionality is broken or altered by the schema modifications.
    *   If the new test case for white-label provisioning fails.