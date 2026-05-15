*   **LifeOS App URLs**
    *   Main application entry: `{{PUBLIC_BASE_URL}}/overlay/lifeos-app.html`
    *   Default dashboard view: `{{PUBLIC_BASE_URL}}/overlay/lifeos-dashboard.html`
    *   Login page: `{{PUBLIC_BASE_URL}}/overlay/lifeos-login.html`

*   **Builder Queue Management**
    *   The specific file path for the builder queue JSON is not available in the provided context. It is typically managed by the `lifeos:builder:queue` script.
    *   After manual edits to the queue (if applicable), reset the cursor: `npm run lifeos:builder:queue -- --reset-cursor`

*   **Railway Council Operations**
    *   Run a gate-change preset (e.g., `maturity`): `npm run lifeos:gate-change-run -- --preset maturity`

*   **Other Commands**
    *   `npm run lifeos:operational-grade`: Not found in the provided repository context.
    *   `npm run tsos:builder`: Not found in the provided repository context.