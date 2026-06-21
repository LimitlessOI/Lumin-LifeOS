<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G138 100. -->

Amendment 14 White-Label Proof: G138-100 - Application Name Configuration
This proof note addresses the foundational white-label requirement for dynamically configuring the primary application name displayed across the platform. This is a critical first step to ensure branding flexibility without modifying core code.
1. Exact Missing Implementation or Proof Gap
The current system hardcodes the "LifeOS" application name in key UI components and potentially in API responses or metadata. The gap is the absence of a centralized, configurable mechanism to override this name based on tenant or deployment context, and the lack of a corresponding UI rendering logic that consumes this configuration.
2. Smallest Safe Build Slice to Close It
Introduce a new configuration entry for `APP_DISPLAY_NAME` (or similar) in the BuilderOS configuration system, and update one primary UI component (e.g., the main header/navbar) to consume this configuration instead of a hardcoded string.
3. Exact Safe-Scope Files to Touch First
-   `builder-os/config/default.js` (or similar config file): Add `APP_DISPLAY_NAME` entry with a default value.
-   `builder-os/services/configService.js` (or similar config loading service): Ensure `APP_DISPLAY_NAME` is loaded and accessible via a getter.
-   `lifeos-ui/src/components/layout/Header.jsx` (or similar main header component): Modify to read `APP_DISPLAY_NAME` from the config service and render it.
4. Verifier/Runtime Checks
1.  Configuration Override Test:
-   Modify `builder-os/config/default.js` to set `APP_DISPLAY_NAME = "My White Label App"`.
-   Deploy the BuilderOS and LifeOS UI.
-   Verify that the main header/navbar in the LifeOS UI displays "My White Label App" instead of "LifeOS".
2.  Environment Variable Override Test:
-   Set an envVar `BUILDEROS_APP_DISPLAY_NAME="Client X Platform"` (assuming BuilderOS config supports env var overrides).
-   Deploy.
-   Verify the UI displays "Client X Platform".
3.  No Regression: Ensure no other parts of the UI or system unexpectedly display the new name if they are not intended to consume this specific configuration.
5. Stop Conditions if Runtime Truth Disagrees
-   If the UI continues to display "LifeOS" despite configuration changes in `default.js` or via envVars.
-   If changing `APP_DISPLAY_NAME` causes unexpected errors or breaks other UI components.
-   If the configuration mechanism is not robust (e.g., envVars do not override defaults as expected).
-   If the change requires modifications outside the specified safe-scope files to achieve the desired outcome, indicating a larger architectural dependency.
This build slice focuses solely on the display name. Subsequent slices will address other branding elements like logos, favicons, and color schemes.