Summary:
A gap audit was requested for `lifeos-dashboard.html` and `lifeos-app.html` against `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`. However, the brief file (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md`) was not found in the repository, preventing a direct comparison against the specified requirements. The audit therefore describes the current state of the HTML files regarding sidebar, bottom tabs, AI rail direction, light/dark intent, and mobile vs desktop responsiveness.

Gaps vs brief:
The `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file was not found (`READ ERROR: ENOENT`), making it impossible to identify concrete gaps against the brief's specifications for sidebar, bottom tabs, AI rail direction, light/dark intent, and mobile vs desktop design.

Based on the provided HTML files:
- **`lifeos-dashboard.html`**:
    - **Sidebar**: Not present. This file appears to be a standalone content page.
    - **Bottom tabs**: Not present.
    - **AI rail direction**: An AI rail root (`#lifeos-ai-rail-root`) is included, implying an AI rail, but its specific direction (e.g., left, right, top, bottom) is not defined within this HTML file's CSS or structure. It's likely controlled by `lifeos-dashboard-ai-rail.css` (not provided) and `lifeos-dashboard-ai-rail.js`.
    - **Light/dark intent**: Supports light/dark theme toggling via `lifeos-theme.js` and a `toggleTheme()` function.
    - **Mobile vs desktop**: Implements responsive design with media queries for `min-width: 640px` (two-column layout) and `min-width: 1000px` (wider content, larger text/padding).

- **`lifeos-app.html`**:
    - **Sidebar**: Features a persistent sidebar (`<nav class="sidebar">`) with collapse functionality (`.sidebar.mini`).
    - **Bottom tabs**: Includes a mobile-specific bottom navigation bar (`.mobile-bottomnav`) with tabs.
    - **AI rail direction**: Implements a "Lumin Persistent Drawer" which functions as a right-side drawer on desktop and a bottom sheet on mobile. A "Lumin Quick Bar" is also present at the top of the main content area.
    - **Light/dark intent**: Supports light/dark theme toggling via `lifeos-theme.js` and `cycleTheme()`/`setTheme()` functions.
    - **Mobile vs desktop**: Implements comprehensive responsive design with media queries for `min-width: 600px` (icon-only sidebar), `max-width: 599px` (full mobile layout with hidden sidebar, mobile topbar, and bottomnav), and `min-width: 1000px` (full sidebar). The Lumin drawer also adapts its presentation for mobile.

Recommended next queued builds:
1. Add SQL validation gate for `.sql` files before builder commits them
2. Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`

Open questions if any:
- The `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing, which is critical for a complete gap audit against the intended design.