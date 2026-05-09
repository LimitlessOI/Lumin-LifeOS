### (1) NEEDS ASSESSMENT

Adam needs a functional prototype that provides core LifeOS capabilities today. This includes:

*   **Shell**: A stable, responsive application shell (`lifeos-app.html`) with working navigation (sidebar/bottom nav), user settings, and theme toggling. This shell must correctly load content into the `content-frame` iframe.
*   **Dashboard**: A primary dashboard (`lifeos-dashboard.html`) that displays key information such as Most Important Tasks (MITs), Today's Schedule, Goals, and Life Scores. These widgets should load data from their respective API endpoints.
*   **Authentication**: The ability to sign in, manage a `COMMAND_CENTER_KEY` (API key), and sign out, as exposed through the settings panel.
*   **Chat/Lumin Paths**: Direct access to Lumin chat via a Floating Action Button (FAB), a quick-bar entry, and a dedicated chat page. This includes sending messages, receiving replies, and basic voice input functionality. The chat should persist threads and load message history.

### (5) NEXT FIVE queue task IDs

Since `LIFEOS_DASHBOARD_BUILDER_QUEUE.json` is unavailable, the next five tasks are derived from the "Next approved tasks" and "Current known gaps" in the provided context, ordered by appearance:

1.  Add SQL validation gate for `.sql` files before builder commits them
2.  Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
3.  `GET /api/v1/lifeos/builder/history` endpoint exists but returns limited audit data (This is a gap to address, implying a task to expand its data)
4.  `npm run memory:seed` must be run manually after first deploy — no auto-seed on boot (This is a gap to address, implying a task to automate seeding)
5.  Add HTML validation (basic structure check) for `.html` files

To run a gate-change preset, use the following CLI command:
`npm run lifeos:gate-change-run -- --preset <preset_key>`

Ensure `COMMAND_CENTER_KEY` and `PUBLIC_BASE_URL` are set in your shell environment.