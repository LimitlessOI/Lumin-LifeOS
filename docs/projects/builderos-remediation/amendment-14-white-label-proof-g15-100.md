Amendment 14 White-Label Proof: G15-100 - Dynamic Favicon Integration
This document outlines the next smallest build slice to address a specific proof gap within Amendment 14, focusing on dynamic favicon integration for white-labeled instances.
---
Blueprint Note for C2 Build Pass
1.  Exact missing implementation or proof gap:
    The proof gap is the absence of a fully implemented and verified mechanism within BuilderOS to dynamically serve white-label specific favicons based on the active tenant/instance configuration. This includes the configuration, API exposure, and frontend application of the favicon URL.

2.  Smallest safe build slice to close it:
    *   **Configuration Extension**: Augment the existing white-label configuration schema to include a `faviconUrl` field. This field will store the path or URL to the white-label specific favicon.
    *   **BuilderOS API Enhancement**: Extend an existing BuilderOS configuration API endpoint (e.g., `/api/builderos/v1/config/whitelabel`) to retrieve and expose the `faviconUrl` as part of the white-label configuration payload.
    *   **Frontend Favicon Injection**: Modify the base HTML template or a core frontend component responsible for rendering the `<head>` section to dynamically read the `faviconUrl` from the BuilderOS configuration and update the `<link rel="icon">` tag's `href` attribute accordingly.

3.  Exact safe-scope files to touch first:
    *   `src/builderos/config/schemas/whiteLabelConfigSchema.js` (or similar, for schema definition)
    *   `src/builderos/api/controllers/whiteLabelConfigController.js` (or similar, for API logic)
    *   `src/builderos/web/views/baseTemplate.html` (or `src/builderos/web/components/AppShell.js` for frontend rendering)

4.  Verifier/runtime checks:
    *   **Configuration Persistence Check**: Verify that `faviconUrl` values are correctly stored and retrieved from the BuilderOS configuration database for various white-label instances.
    *   **API Response Validation**: Make a direct API call to the BuilderOS white-label configuration endpoint for different white-label contexts and assert that the `faviconUrl` field is present and contains the expected URL.
    *   **Browser Inspection**: Load a white-labeled instance in a browser, open developer tools, and inspect the `<head>` section to confirm the `<link rel="icon">` tag's `href` attribute dynamically points to the correct favicon URL.
    *   **Visual Confirmation**: Observe the browser tab/window icon to ensure the correct, white-label specific favicon is displayed.

5.  Stop conditions if runtime truth disagrees:
    *   **Configuration Mismatch**: If the `faviconUrl` is not correctly persisted, retrieved, or is inconsistent across BuilderOS configuration layers.
    *   **API Endpoint Failure**: If the BuilderOS white-label configuration API endpoint fails to return the `faviconUrl` or returns an incorrect/malformed URL.
    *   **Frontend Rendering Error**: If the frontend fails to dynamically update the `<link rel="icon">` tag, or if the updated URL results in a 404 error or displays an incorrect image.
    *   **Security/Access Violation**: If the dynamic favicon mechanism inadvertently exposes non-whitelisted assets or introduces any security vulnerabilities.