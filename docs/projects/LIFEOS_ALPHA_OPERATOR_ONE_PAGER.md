*   **LifeOS App URL Pattern**: `{{PUBLIC_BASE_URL}}/overlay/lifeos-app.html?page=<page-name>.html&layout=<auto|mobile|desktop>`
    *   **Dashboard Default Query**: `?page=lifeos-dashboard.html`
*   **Login Overlay Path**: `{{PUBLIC_BASE_URL}}/overlay/lifeos-login.html`
*   **Operational Grade Build**: `npm run lifeos:operational-grade`
*   **Builder Start**: `npm run tsos:builder`
*   **Builder Queue JSON Location**: Managed by `npm run lifeos:builder:queue` script (specific file path not explicitly provided in context).
*   **Reset Builder Queue Cursor**: `npm run lifeos:builder:queue -- --reset-cursor`
*   **Railway Council Gate Change Run**: `npm run lifeos:gate-change-run -- --preset maturity`