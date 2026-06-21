<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G24 100. -->

### Amendment 14 White Label Proof - G24-100 Remediation Note

This note defines the next smallest build slice to achieve verifiable proof for Amendment 14 White Labeling, specifically for client G24-100. The previous rejection was an environmental verifier issue, not a content issue with the Markdown itself.

**1. Exact Missing Implementation or Proof Gap:**
The gap is the concrete, verifiable application of white-label configuration for G24-100. The blueprint defines the capability; the proof requires a demonstration of G24-100 specific branding (logo, primary color) loaded and applied based on a tenant identifier within BuilderOS, ensuring no LifeOS branding is visible for this tenant.

**2. Smallest Safe Build Slice to Close It:**
Implement initial configuration and asset mapping for the G24-100 white-label tenant. This slice focuses on:
*   Defining a configuration entry for G24-100.
*   Mapping G24-100's specific logo and primary color assets.
*   Ensuring these assets are accessible and loadable by the BuilderOS frontend for preview.
This is a BuilderOS-only change, not impacting LifeOS user features or TSOS customer surfaces.

**3. Exact Safe-Scope Files to Touch First:**
*   `builder-os/config/white-label-tenants.json`: Add G24-100 tenant configuration.
*   `builder-os/assets/g24-100/logo.png`: Placeholder for G24-100 logo.
*   `builder-os/assets/g24-100/styles.css`: Placeholder for G24-100 primary color variable override.
*   `builder-os/services/whiteLabelService.js`: Update logic to load G24-100 config and assets.

**4. Verifier/Runtime Checks:**
*   **Unit Test:** `test/builder-os/services/whiteLabelService.test.js`: Verify `whiteLabelService.getTenantConfig('G24-100')` returns expected configuration including asset paths.
*   **Integration Test (BuilderOS):** Simulate BuilderOS preview for tenant 'G24-100'. Assert logo `src` points to `/builder-os/assets/g24-100/logo.png` and primary color CSS variable reflects G24-100 value.
*   **Manual Verification (BuilderOS UI):** Load BuilderOS preview for G24-100. Visually confirm G24-100 logo and primary UI color.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   `whiteLabelService.getTenantConfig('G24-100')` returns incorrect/incomplete configuration.
*   BuilderOS preview for G24-100 displays LifeOS branding elements.
*   Asset loading for G24-100 fails (e.g., 404 for `logo.png` or `styles.css`).
*   BuilderOS UI for G24-100 shows visual artifacts or incorrect styling not from G24-100 assets.