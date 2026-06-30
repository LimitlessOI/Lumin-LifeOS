<!-- SYNOPSIS: Documentation — DASHBOARD SHELL GAP AUDIT. -->

Summary:
The requested gap audit against `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` cannot be performed as the brief document is unreadable (`ENOENT`). However, an analysis of `lifeos-dashboard.html` and `lifeos-app.html` reveals architectural inconsistencies and potential redundancies in UI component implementation, particularly concerning theme management and AI chat functionality.

Gaps vs brief:
*   **Brief Unavailability:** The primary gap is the inability to compare against the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` due to a read error (`ENOENT`). This prevents validation of specific design choices for sidebar, bottom tabs, AI rail direction, light/dark intent, and mobile vs desktop layouts against the authoritative specification.
*   **AI Chat Duplication:** `public/overlay/lifeos-dashboard.html` implements a full "Chat with Lumin" section, including message display, input, and send functionality. This duplicates the persistent Lumin drawer and its chat capabilities provided by the `public/overlay/lifeos-app.html` shell. A core platform brief would likely centralize such a fundamental AI interaction component within the shell, not allow feature pages to reimplement it.
*   **Theme Management Redundancy:** Both `public/overlay/lifeos-app.html` and `public/overlay/lifeos-dashboard.html` import `lifeos-theme.js` and contain logic for theme toggling. While `lifeos-dashboard.html`'s theme logic is within a script tag and might be intended for its own content, the shell (`lifeos-app.html`) is the authoritative source for global theme. This creates potential for conflicting theme states or redundant code.

Recommended next queued builds:
*   **Centralize AI Chat:** Refactor `public/overlay/lifeos-dashboard.html` to remove its embedded "Chat with Lumin" section. Instead, integrate with the `Lumin Drawer` provided by `public/overlay/lifeos-app.html` for all AI chat interactions.
*   **Consolidate Theme Logic:** Ensure `public/overlay/lifeos-dashboard.html` (and other content pages) rely solely on the theme state managed by `public/overlay/lifeos-app.html` and `lifeos-theme.js`. Remove redundant theme-related JavaScript and CSS variables from content pages.
*   **Implement Brief Access:** Address the `ENOENT` error for `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` to enable future audits against the authoritative specification.

Open questions if any:
*   What is the intended interaction model between content pages (like `lifeos-dashboard.html`) and the shell's Lumin drawer? Should content pages be able to initiate specific Lumin conversations or only display a general chat interface?
*   Is `lifeos-dashboard.html` ever intended to be loaded outside the `lifeos-app.html` iframe, justifying its self-contained theme and chat logic?
*   What is the authoritative source for theme management? The shell's `lifeos-theme.js` or individual page scripts? The current setup suggests potential for conflict.