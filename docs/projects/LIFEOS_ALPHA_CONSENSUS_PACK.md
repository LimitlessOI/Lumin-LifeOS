### (1) NEEDS ASSESSMENT

Adam needs a functional prototype to interact with LifeOS today. Based on the provided `lifeos-app.html` and `lifeos-dashboard.html` files, the core components required for immediate use are:

-   **Shell**: A responsive application frame (`lifeos-app.html`) providing global navigation (sidebar/bottom nav), user settings (display name, handle, API key), and theme toggling. This includes the ability to switch between different content pages (e.g., Dashboard, Today, Chat).
-   **Dashboard**: A primary landing page (`lifeos-dashboard.html`) that aggregates key information such as Most Important Tasks (MITs), Today's Schedule, Goals, Life Scores, and a quick chat interface with Lumin. This provides an at-a-glance overview of Adam's day and progress.
-   **Authentication**: The system requires Adam to provide a `COMMAND_CENTER_KEY` (referred to as "Command Key" in settings) for API access. This key is essential for all backend interactions, including loading MITs, calendar events, goals, scores, and communicating with Lumin. The `lifeos-bootstrap.js` handles key prompting.
-   **Chat/Lumin Paths**: Direct access to Lumin, the AI assistant, is crucial. This includes:
    -   A persistent Lumin drawer for quick interactions.
    -   A dedicated "Lumin Chat" page for full history and focused conversations.
    -   Voice input capabilities for hands-free interaction.
    -   The "Ask Lumin anything..." quick bar on the dashboard.

To get started, Adam needs to ensure his shell environment is configured with the necessary API key and base URL:
`export COMMAND_CENTER_KEY="your_api_key_here"`
`export PUBLIC_BASE_URL="https://your-lifeos-instance.com"`

### (5) NEXT FIVE queue task IDs

The `LIFEOS_DASHBOARD_BUILDER_QUEUE.json` file, which specifies the ordered task IDs, was not found in the repository. Therefore, the exact next five task IDs cannot be listed. Based on the "Next approved tasks" from the initial prompt, the immediate priorities are:

1.  Add SQL validation gate for `.sql` files before builder commits them
2.  Add HTML validation (basic structure check) for `.html` files
3.  Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
4.  Add auto-seed on boot (check if epistemic_facts is empty, run seed)