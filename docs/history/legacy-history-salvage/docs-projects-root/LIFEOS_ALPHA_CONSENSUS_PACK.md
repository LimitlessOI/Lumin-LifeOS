<!-- SYNOPSIS: Documentation — LIFEOS ALPHA CONSENSUS PACK. -->

### NEEDS ASSESSMENT

Adam needs the following to effectively use the LifeOS prototype today:

*   **Shell**: The core application framework (`lifeos-app.html`) provides navigation via a persistent sidebar (desktop) or mobile bottom tabs, allowing Adam to switch between different LifeOS sections like Dashboard, Today, Chat, and Mirror.
*   **Dashboard**: The primary landing page (`lifeos-dashboard.html`) offers a consolidated view of Adam's Most Important Tasks (MITs), daily schedule, goals, and life scores. It also includes an embedded chat interface for quick interactions with Lumin.
*   **Authentication**: Adam requires a `COMMAND_CENTER_KEY` (also referred to as `x-lifeos-key` or `lifeos_api_key`) to authenticate with the LifeOS backend. This key, along with a user handle and display name, is managed through the Settings panel.
*   **Chat/Lumin Paths**:
    *   **Quick Access**: Lumin is readily available through a floating action button (FAB), a quick-access bar at the top of the content area, or a `Cmd/Ctrl+L` keyboard shortcut, opening a persistent drawer for immediate conversation.
    *   **Full History**: A "Full history" link within the Lumin drawer allows Adam to transition to a dedicated chat page (`lifeos-chat.html`) for more extensive conversations and review.
    *   **Voice Interaction**: Both the quick-access Lumin drawer and the dashboard chat support voice input, with an "always-on" listening option available via a toggle in the topbar/mobile topbar.
    *   **Ambient Sense**: Lumin can provide proactive, low-power ambient hints, configurable in the Settings panel and indicated by a button on the dashboard.

To execute CLI commands, Adam needs `COMMAND_CENTER_KEY` and `PUBLIC_BASE_URL` set in their shell environment. For example:
`npm run lifeos:gate-change-run -- --preset program-start`

### NEXT FIVE queue task IDs

1.  Add SQL validation gate for `.sql` files before builder commits them
2.  Add HTML validation (basic structure check) for `.html` files
3.  Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
4.  Add auto-seed on boot (check if epistemic_facts is empty, run seed)
5.  Improve `GET /api/v1/lifeos/builder/history` to return more audit data