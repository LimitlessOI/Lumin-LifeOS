# Amendment 14 White-Label Proof: G28-100 Remediation

## Blueprint Note for C2 Build Pass

This document outlines the next smallest build slice to address the white-label proof gap for client G28-100 within the BuilderOS platform, following the AMENDMENT_14_WHITE_LABEL blueprint.

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS UI lacks dynamic white-label asset loading for client G28-100. Specifically, the proof that G28-100's unique branding (e.g., custom logo) is correctly applied and rendered across BuilderOS surfaces is incomplete. The implementation gap is the mechanism to fetch and apply client-specific branding configurations at runtime within BuilderOS components.

### 2. Smallest Safe Build Slice to Close It

Implement dynamic logo loading for client G28-100 in the BuilderOS header component. This involves:
a. Defining G28-100's white-label configuration (specifically, its logo URL).
b. Creating a service to retrieve client-specific configurations.
c. Modifying the BuilderOS header component to consume this configuration and conditionally render the G28-100 logo when the client context is G28-100.

This slice focuses on a single, visible asset in a prominent, isolated component to minimize risk and provide immediate visual proof.

### 3. Exact Safe-Scope Files to Touch First

*   `config/clients/g28-100.js`: Create this file to define the white-label configuration for G28-100, including `logoUrl: '/assets/g28-100/logo.svg'`.
*   `src/builder-os/services/clientConfigService.js`: Extend this service (or create if non-existent, following existing patterns for service creation) to provide a `getClientConfig(clientId)` method that loads configurations from `config/clients/{clientId}.js`.
*   `src/builder-os/components/BuilderHeader.jsx`: Modify this React component to:
    *   Import `clientConfigService`.
    *   On component mount, fetch the current client's configuration using `clientConfigService.getClientConfig()`.
    *   Conditionally render an `<img>` tag with the `logoUrl` from the fetched configuration if a G28-100 client context is detected. Fallback to default BuilderOS logo if no specific client config or logo is found.

### 4. Verifier/Runtime Checks

**Verifier Checks (Static/Automated):**
*   **Syntax/Linting:** Ensure all modified files adhere to existing ESLint rules and TypeScript types (if applicable).
*   **Unit Tests:**
    *   `clientConfigService.test.js`: Verify `getClientConfig('g28-100')` returns the expected G28-100 configuration object.
    *   `BuilderHeader.test.jsx`: Snapshot tests for `BuilderHeader` rendering with and without G28-100 client context, ensuring the correct logo `src` attribute is present.
*   **Integration Tests:** If applicable, an integration test that mounts the BuilderOS application with a mocked G28-100 client context and asserts the presence of the G28-100 logo in the header.

**Runtime Checks (Manual/Observational):**
*   **Deployment:** Deploy the BuilderOS application to a staging environment configured for G28-100.
*   **Visual Inspection:** Access the BuilderOS UI as a G28-100 user. Visually confirm that the G28-100 specific logo is displayed in the header.
*   **Browser Dev Tools:**
    *   Inspect the logo element: Verify the `src` attribute of the `<img>` tag points to `/assets/g28-100/logo.svg`.
    *   Network tab: Confirm that `/assets/g28-100/logo.svg` is successfully loaded (HTTP 200).
    *   Console: Check for any errors related to asset loading or component rendering.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Incorrect Logo:** If the G28-100 logo is not displayed, or an incorrect logo (e.g., default BuilderOS logo, another client's logo) is displayed when operating under G28-100 context.
*   **Asset Loading Failure:** If the G28-100 logo image fails to load (e.g., 404, network error, corrupted asset).
*   **UI Regression:** If the implementation causes any existing BuilderOS UI elements to break, misalign, or function incorrectly, especially in the header or surrounding components.
*   **Performance Degradation:** If the dynamic configuration loading introduces noticeable latency or performance issues in the BuilderOS UI.
*   **Security/Data Leakage:** If there is any indication that client-specific configurations are accessible to unauthorized clients or users.
*   **Client Context Mismatch:** If the application fails to correctly identify the G28-100 client context, leading to incorrect branding application.

This build pass aims to establish the foundational mechanism for dynamic white-label asset loading, providing concrete proof for G28-