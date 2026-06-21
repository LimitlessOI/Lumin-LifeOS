<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G41 100. -->

Amendment 14: White-Label Proof - G41-100 - Initial Context Proof
Status
This document serves as proof for the successful completion of Gate 41, Slice 100, for Amendment 14 (White-Labeling). This slice focused on establishing the foundational mechanism for identifying a white-label context within the LifeOS platform and loading initial, minimal configuration.

Achieved Proof Points
-   Context Identification: Successfully demonstrated the ability to identify the active white-label context (e.g., via request headers, hostname, or session attributes).
-   Configuration Loading: Verified that a basic, context-specific configuration object can be loaded and made available to the application layer. This includes a placeholder `whiteLabelId` and a `displayName`.

---

Blueprint Note: Next Smallest Build Slice (G41-101)

1.  **Exact Missing Implementation or Proof Gap**:
    The current slice (G41-100) successfully proves the identification of a white-label context and the loading of its minimal configuration (`whiteLabelId`, `displayName`). The critical next gap is to prove the *internal application* of this loaded configuration within the BuilderOS platform, specifically making a white-label specific value (e.g., `displayName`) accessible and verifiable via an internal BuilderOS mechanism. This demonstrates that the loaded configuration can be consumed by other BuilderOS components.

2.  **Smallest Safe Build Slice to Close It**:
    Implement an internal BuilderOS diagnostic endpoint that retrieves and exposes the `displayName` associated with the active white-label context. This endpoint will serve as a verifiable proof point that the loaded configuration is correctly applied and accessible within the BuilderOS runtime.

3.  **Exact Safe-Scope Files to Touch First**:
    *   `src/builder-os/services/whiteLabelContext.js`: Extend or create a utility/service to encapsulate white-label context retrieval, adding a method like `getDisplayName()` that returns the currently active white-label's display name.
    *   `src/builder-os/api/diagnostics.js`: Add a new internal API route (e.g., `/builder-os/diagnostics/white-label-info`) that utilizes `whiteLabelContext.getDisplayName()` and returns it in a JSON response.

4.  **Verifier/Runtime Checks**:
    *   **Test Case 1 (Known White-Label)**: Make an HTTP GET request to `/builder-os/diagnostics/white-label-info` with a specific white-label context identifier (e.g., `X-White-Label-ID: clientA` header).
        *   **Expected Outcome**: The response JSON should be `{"displayName": "Client A Name"}` (assuming "Client A Name" is the configured `displayName` for `clientA`).
    *   **Test Case 2 (Default/No White-Label)**: Make an HTTP GET request to `/builder-os/diagnostics/white-label-info` without any white-label context identifier.
        *   **Expected Outcome**: The response JSON should be `{"displayName": "LifeOS Default"}` (or whatever the platform's default display name is).

5.  **Stop Conditions if Runtime Truth Disagrees**:
    *   The diagnostic endpoint returns an incorrect `displayName` for a given white-label context.
    *   The endpoint fails to correctly identify the white-label context from the request.
    *   The endpoint returns an error or an empty response when a `displayName` is expected.
    *   Errors are logged during the retrieval or application of the `displayName` from the `whiteLabelContext` service.