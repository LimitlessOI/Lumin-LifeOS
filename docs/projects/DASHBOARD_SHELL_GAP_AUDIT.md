Summary:
The `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` document, which is authoritative for this audit, was not found (`ENOENT`). Therefore, a direct comparison of `lifeos-dashboard.html` and `lifeos-app.html` against the brief's specifications (sidebar, bottom tabs, AI rail direction, light/dark intent, mobile vs desktop) cannot be performed.

Gaps vs brief:
The primary gap is the absence of the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` document. Without this authoritative source, it is impossible to identify concrete gaps in `lifeos-dashboard.html` and `lifeos-app.html` relative to the intended design specifications.

Recommended next queued builds:
Based on the provided "Next approved tasks":
1.  Add SQL validation gate for `.sql` files before builder commits them.
2.  Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`.

Open questions:
1.  What is the correct path or content for `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`?
2.  Should the audit proceed based on inferred design principles from the HTML, or is the brief absolutely required?