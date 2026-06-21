<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G120 100. -->

Amendment 14: White-Label Proof - G120-100
Overview
This document serves as a proof point for the implementation of Amendment 14, focusing specifically on the white-label application for component/group G120-100. It details the current status and outlines the next smallest build slice required for full compliance.
Reference Blueprint
This proof is derived from the requirements outlined in `docs/projects/AMENDMENT_14_WHITE_LABEL.md`. This blueprint specifies the global white-label configuration points and the expected visual outcomes across various platform surfaces.
Current Status (G120-100)
For G120-100, the foundational configuration for white-label assets (e.g., logos, color palettes, typography settings) is established and accessible via the `whiteLabelService`. The service successfully retrieves the appropriate `whiteLabelConfig` object based on the current tenant context. However, the direct application of these retrieved assets to the target UI component(s) associated with G120-100 is not yet fully implemented. The component currently renders with default styling.
Proof-Closing Blueprint Note
1. Exact Missing Implementation or Proof Gap
The specific gap is the programmatic application of the retrieved `whiteLabelConfig` (containing properties like `logoUrl`, `primaryColor`, `fontFamily`) to the designated UI component(s) associated with G120-100. While the configuration is available, the rendering layer of `G120Component` does not yet dynamically consume and apply these settings to its visual elements.
2. Smallest Safe Build Slice to Close It
Implement a utility function or integrate directly within the `G120Component` to consume the `whiteLabelConfig` object. This logic will dynamically set CSS properties (e.g., via CSS variables or inline styles) on relevant elements within `G120Component` based on `primaryColor`, `fontFamily`, and update `src` attributes for images using `logoUrl`. This ensures the component visually adapts to the white-label configuration.
3. Exact Safe-Scope Files to Touch First
- `src/components/G120Component/G120Component.js` (or `.jsx`/`.ts`/`.tsx`): Modify the component to accept `whiteLabelConfig` as a prop or consume it from a context/hook, then apply the styles.
- `src/components/G120Component/G120Component.module.css` (or `.scss`/`.less`): Potentially define CSS variables that can be updated dynamically by the JS.
4. Verifier/Runtime Checks
- **Visual Inspection:** Manually verify `G120Component` renders with the correct logo, primary color, and font family in a development environment with a specific white-label tenant context.
- **Automated UI Tests:** Add or update Playwright/Cypress tests targeting `G120Component` to assert the presence of the correct `src` attribute for the logo image and computed CSS values for `background-color`, `color`, `font-family` on relevant elements.
- **Unit Tests:** Ensure `G120Component`'s rendering logic correctly processes and applies `whiteLabelConfig` when provided.
- **Network Tab:** Verify the `logoUrl` asset is loaded correctly without errors.
5. Stop Conditions if Runtime Truth Disagrees
- If `G120Component` continues to display default styling instead of white-label specific assets/colors/fonts.
- If console errors related to image loading, CSS application, or `whiteLabelConfig` consumption are observed.
- If automated UI tests fail, indicating incorrect visual rendering or style application.
- If performance metrics for `G120Component` show significant degradation after the changes.