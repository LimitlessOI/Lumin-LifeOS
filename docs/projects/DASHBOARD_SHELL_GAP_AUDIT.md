Summary
The `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file, which is essential for performing the requested gap audit, was reported as `ENOENT` (file not found) in the injected file contents. Consequently, a direct comparison of `lifeos-dashboard.html` and `lifeos-app.html` against the brief's specified design intent (sidebar, bottom tabs, AI rail direction, light/dark intent, mobile vs desktop) cannot be performed.

Gaps vs brief
Cannot assess specific gaps against the brief due to the unavailability of `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`.

Recommended next queued builds
1. Add SQL validation gate for `.sql` files before builder commits them.
2. Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`.

Open questions if any
1. Clarification on the availability and content of `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is required to proceed with the requested gap audit.