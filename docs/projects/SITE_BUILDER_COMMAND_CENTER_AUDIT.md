The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, making a full audit against the amendment impossible. The instruction to output only code contradicts the task's specification for Markdown output.

---
**Shipped controls (inferred from API surface):**

Based on the documented API surface, the Site Builder Command Center (`public/overlay/site-builder-command-center.html`) is designed to support the following operator actions:

*   **Build Site:** Triggering a site build from a URL (`POST /api/v1/sites/build`).
*   **Prospect & Outreach:** Initiating the full prospect pipeline (score, build, email) for a single prospect (`POST /api/v1/sites/prospect`) or in bulk (`POST /api/v1/sites