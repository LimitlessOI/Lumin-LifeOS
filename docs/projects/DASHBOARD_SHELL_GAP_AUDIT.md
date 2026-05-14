Summary
A gap audit against the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_BUILDER_QUEUE.md` cannot be performed. The injected file contents indicate that both brief documents are missing from the repository (`READ ERROR: ENOENT`). Without the authoritative brief, a comparison of `lifeos-dashboard.html` and `lifeos-app.html` against the specified design intent (sidebar, bottom tabs, AI rail direction, light/dark intent, mobile vs desktop) is not possible.

Gaps vs brief
This section cannot be completed as the source of truth for the brief (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md`) is unavailable. Therefore, no concrete gaps can be identified relative to the brief's requirements.

Recommended next queued builds
1.  **Recreate/Retrieve `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`**: This document is essential for defining the design intent and requirements for the dashboard and app shell.
2.  **Recreate/Retrieve `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md`**: This document is needed to understand the planned feature queue and prioritize development.
3.  **Re-run gap audit**: Once the brief documents are available, re-run this audit to compare the current HTML implementations against the defined specifications.

Open questions if any
1.  What is the authoritative source for the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_BUILDER_QUEUE.md` content?
2.  Are there alternative sources or stakeholders who can provide the missing brief information?
3.  Should the builder proceed with any dashboard/app shell changes without a clear, documented brief?