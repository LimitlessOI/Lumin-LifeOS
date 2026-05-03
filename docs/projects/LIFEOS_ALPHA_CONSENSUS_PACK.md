### LifeOS ALPHA Consensus Pack

This document outlines the immediate needs for the LifeOS Alpha prototype and the next five prioritized tasks for the builder queue.

### 1. NEEDS ASSESSMENT

To enable Adam to effectively use the LifeOS prototype today, the following core components and paths are essential and must be functional:

*   **Shell**: The foundational application shell, provided by `lifeos-app.html`, including the persistent sidebar navigation (collapsible), the desktop topbar, and the mobile bottom navigation. This provides the primary interface for interacting with all LifeOS features.
*   **Dashboard**: The `lifeos-dashboard.html` serves as the central hub for daily overview. It must display Most Important Tasks (MITs), Today's Schedule, Goals, Life Scores, and the integrated "Chat with Lumin" section. This page is the default landing experience.
*   **Authentication**: Secure access to the platform is paramount. Adam requires a functional authentication mechanism, primarily through the `COMMAND_CENTER_KEY` (or `lifeos_api_key`) for API interactions. The settings panel in `lifeos-app.html` provides the interface for managing this key and user display name.
*   **Chat/Lumin Paths**: Direct and persistent access to Lumin, the AI assistant, is a core interaction model. This includes the Lumin persistent drawer (accessible via FAB and quick bar in `lifeos-app.html`), the dedicated "Lumin Chat" page (`lifeos-chat.html`), and the embedded chat on the Dashboard. Voice input (`lifeos-voice.js`) and ambient nudges (`lifeos-ambient-sense.js`) are key interaction modalities.

### 5. NEXT FIVE Queue Task IDs

Based on the approved tasks and known gaps, the next five prioritized tasks for the builder queue are:

1.  `Add SQL validation gate for .sql files before builder commits them`
2.  `Wire npm run memory:ci-evidence into .github/workflows/smoke-test.yml`
3.  `Add HTML validation (basic structure check) for .html files`
4.  `Add auto-seed on boot (check if epistemic_facts is empty, run seed)`
5.  `Improve builder history endpoint to return full audit data`

### CLI Example

To trigger a build task for the platform domain:

```bash
curl -X POST -H "Content-Type: application/json" -H "x-command-key: $COMMAND_CENTER_KEY" "$PUBLIC_BASE_URL/api/v1/lifeos/builder/build" -d '{"domain": "platform", "task_description": "Generate the LifeOS ALPHA consensus pack."}'
```