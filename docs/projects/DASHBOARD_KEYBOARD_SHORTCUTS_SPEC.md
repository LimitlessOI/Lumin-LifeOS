# LifeOS Dashboard & App Chrome Builder Brief

## Project: Global Shortcuts Specification

**Date:** 2026-04-26
**Status:** Specification Only (Implementation Deferred)
**Target:** Dashboard (`public/overlay/lifeos-dashboard.html`) and App Chrome (`public/overlay/lifeos-app.html`)

### Overview

This document outlines the specification for global keyboard shortcuts within the LifeOS Dashboard and the overarching App Chrome. The goal is to enhance user efficiency through quick access to common functions, while carefully considering usability, accessibility, and potential conflicts with existing system or browser shortcuts.

### Key Considerations

#### 1. Focus Trap for AI Rail

**Feasibility:**
- The AI rail (Lumin drawer) is a critical interaction point. Implementing a focus trap when the rail is open is technically feasible using standard WAI-ARIA patterns and JavaScript. This ensures that keyboard navigation remains within the rail's boundaries, preventing users from tabbing out unintentionally.
- The focus trap should activate upon opening the rail and deactivate upon closing it.
- Initial focus should be placed on the primary input field within the rail.

**Collision/Interaction:**
- A focus trap primarily affects `Tab` and `Shift+Tab` navigation. These are standard browser behaviors for moving focus. The trap would override the default behavior *within the application context* when the rail is active, but not conflict with OS/browser shortcuts themselves.
- Ensure that closing the rail (`Escape` key, for example) correctly restores focus to the element that triggered the rail's opening, or a logical fallback.

#### 2. ⌘K-style Command Palette Feasibility

**Feasibility:**
- A `⌘K` (or `Ctrl+K` on Windows/Linux) command palette is a common pattern for quick access to commands, navigation, and search. This is highly feasible to implement.
- It would involve:
    - A global keyboard listener for `⌘K` (or `Ctrl+K`).
    - A modal overlay containing a search input and a list of actionable items (e.g., "Go to Dashboard", "Add MIT", "Chat with Lumin", "Open Settings").
    - Fuzzy searching/filtering of commands as the user types.
    - Keyboard navigation (up/down arrows, Enter) within the command list.

**Collision/Interaction:**
- `⌘K` (or `Ctrl+K`) is a common shortcut in many applications (e.g., Slack, GitHub, VS Code) for command palettes or search. This pattern is well-established and generally accepted by users.
- **Browser Conflicts:**
    - `⌘K` (macOS) in some browsers (e.g., Safari) can be "Search with Google" or "Add Bookmark". This is a potential collision.
    - `Ctrl+K` (Windows/Linux) is often "Add Bookmark" in Chrome/Firefox. This is a significant collision.
- **OS Conflicts:** Less common for `⌘K`/`Ctrl+K` to have OS-level conflicts, but should be noted.
- **Mitigation Strategies (for implementation phase):**
    - Consider alternative key combinations if `⌘K`/`Ctrl+K` proves too disruptive, though the user expectation for `⌘K` is strong.
    - Provide a clear visual indicator or onboarding hint about the shortcut.
    - Allow users to customize the shortcut in settings (deferred).
    - Prioritize the application's command palette over browser defaults if possible and desirable, but this can lead to user frustration if not handled gracefully.

#### 3. Collisions with OS/Browser Shortcuts (General)

**General Principles:**
- **Prioritize OS/Browser:** Generally, OS and browser shortcuts should take precedence to avoid breaking fundamental user expectations (e.g., `⌘T` for new tab, `⌘W` for close window, `F5` for refresh).
- **Contextual Shortcuts:** Application-specific shortcuts should be contextual where possible (e.g., `Enter` in a chat input sends the message, but `Enter` elsewhere might submit a form or activate a button).
- **Modifier Keys:** Utilize modifier keys (`Shift`, `Alt`/`Option`, `Ctrl`/`Command`) to create unique combinations that are less likely to conflict.
- **Accessibility:** Ensure all functionality accessible via shortcuts is also accessible via standard keyboard navigation (Tab, Shift+Tab, Enter) and mouse/touch.

**Specific Collision Examples:**
- **Navigation:** `Alt+Left/Right` (browser back/forward), `Space` (page scroll).
- **Text Editing:** Standard text editing shortcuts (`⌘C`, `⌘V`, `⌘X`, `⌘Z`, `⌘A`, `⌘S`). These should generally be passed through to the underlying input fields.
- **Zoom/View:** `⌘+`, `⌘-`, `⌘0` (browser zoom).
- **Developer Tools:** `F12`, `⌘⌥I` (browser dev tools).

**Recommendation for Implementation:**
- When implementing, use `event.preventDefault()` judiciously and only when the application *must* handle the shortcut and overriding the browser/OS behavior is the intended and beneficial outcome.
- Document all implemented shortcuts clearly for users.
- Consider a "help" shortcut (e.g., `?` or `Shift+/`) to display a list of available in-app shortcuts.

### Conclusion

The integration of global shortcuts, particularly a `⌘K`-style command palette and focus management for the AI rail, will significantly improve the power-user experience. Careful design and testing will be required during implementation to minimize conflicts and ensure a smooth, intuitive interaction.