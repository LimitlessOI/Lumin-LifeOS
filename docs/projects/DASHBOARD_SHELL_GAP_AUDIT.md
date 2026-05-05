The instruction "NEVER claim ENOENT/missing SSOT docs" is contradicted by the `REPO FILE CONTENTS` which explicitly show `READ ERROR: ENOENT` for `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md`. The injected file bodies override the general instruction.

---
### Summary
A comprehensive gap audit against the intended design brief is not possible as `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is missing from the repository. This audit proceeds by observing `public/overlay/lifeos-dashboard.html` against the implied UI elements mentioned in the task.

### Gaps vs brief
(Note: Without `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, these are observations of current state, not confirmed gaps against a specification.)

*   **Sidebar:** `lifeos-dashboard.html` does not contain an explicit sidebar element. The `lifeos-ai-rail-root` div is present, suggesting an AI-related component, but its structural role as a "sidebar" is not defined in the HTML.
*   **Bottom tabs:** No bottom navigation tabs are present in the `lifeos-dashboard.html` structure.
*   **AI rail direction:** The `lifeos-ai-rail-root` is a placeholder at the end of the `body`. Its specific direction (e.g., fixed right rail, bottom sheet) is not hardcoded in the HTML and would be determined by the associated CSS (`lifeos-dashboard-ai-rail.css`) and JavaScript (`lifeos-dashboard-ai-rail.js`). Without the brief, the intended direction cannot be confirmed.
*   **Light/dark intent:** `lifeos-dashboard.html` fully supports light/dark theme toggling and persistence via `localStorage`, as evidenced by the `toggleTheme()` function and `theme-color-meta` updates. This intent is well-implemented.
*   **Mobile vs desktop:** The HTML includes responsive media queries (`@media (min-width: 640px)`, `@media (min-width: 1000px)`) and mobile-specific meta tags (`viewport-fit=cover`, `apple-mobile-web-app-capable`), indicating a clear intent and implementation for both mobile and desktop layouts.

### Recommended next queued builds
1.  **Create `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`:** Define the complete UI/UX specification for the dashboard, including explicit details for sidebar, bottom tabs, and AI rail direction, and any other intended features.
2.  **Create `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md`:** Establish a task queue for dashboard-related UI/UX builds and refinements.
3.  **Perform detailed audit:** Once the brief is available, conduct a thorough audit of `lifeos-dashboard.html` against the newly defined specifications.

### Open questions
*   What are the precise design and functional requirements for the sidebar and bottom tabs?
*   What is the intended direction and behavior of the AI rail (e.g., fixed right, collapsible, overlay)?
*   Are there any other core UI components or interactions expected that are not currently present in `lifeos-dashboard.html`?