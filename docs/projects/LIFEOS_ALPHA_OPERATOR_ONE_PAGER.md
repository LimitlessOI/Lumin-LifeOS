*   **LifeOS Application URLs**
    *   Main Application Shell: `{{PUBLIC_BASE_URL}}/overlay/lifeos-app.html`
    *   Direct to Dashboard: `{{PUBLIC_BASE_URL}}/overlay/lifeos-app.html?page=lifeos-dashboard.html`
        *   *Note: No default query parameters for the dashboard are specified in available files.*
    *   Login Overlay: `{{PUBLIC_BASE_URL}}/overlay/lifeos-login.html`

*   **Key Operational Commands**
    *   Run operational-grade checks: `npm run lifeos:operational-grade`
    *   Run TSOS builder: `npm run tsos:builder`
    *   Reset builder queue cursor after edits: `npm run lifeos:builder:queue -- --reset-cursor`
    *   Execute Railway council gate-change preset: `npm run lifeos:gate-change-run -- --preset maturity`

*   **Builder Queue JSON Location**
    *   The exact file path for the builder queue JSON is not explicitly defined in the provided repository file contents.