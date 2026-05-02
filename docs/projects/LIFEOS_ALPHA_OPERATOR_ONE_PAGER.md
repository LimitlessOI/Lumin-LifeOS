*   **LifeOS Application URLs**
    *   Main App: `{{PUBLIC_BASE_URL}}/overlay/lifeos-app.html`
    *   Login Page: `{{PUBLIC_BASE_URL}}/overlay/lifeos-login.html`
    *   Dashboard Default View: `{{PUBLIC_BASE_URL}}/overlay/lifeos-dashboard.html` (No default query specified in context)

*   **Operational Commands**
    *   Run operational-grade checks: `npm run lifeos:operational-grade`
    *   Run TypeScript OS builder: `npm run tsos:builder`
    *   Reset builder queue cursor after manual edits: `npm run lifeos:builder:queue -- --reset-cursor`
    *   Execute a Railway council gate-change preset (e.g., 'maturity'): `npm run lifeos:gate-change-run -- --preset maturity`

*   **Builder Queue JSON Location**
    *   The exact path for the builder queue JSON is not specified in the provided repository contents. It is typically located in a `data/` or `config/` directory, or alongside the builder scripts (e.g., `scripts/builder-queue.json`).