# Global Shortcuts for Dashboard & App Chrome

## Overview
This document specifies the requirements and considerations for implementing global keyboard shortcuts within the LifeOS dashboard and the overarching application chrome. The primary focus is on a "focus trap" mechanism for interactive rail components and the feasibility of a ⌘K-style command palette, while carefully evaluating potential collisions with existing operating system and browser shortcuts. Implementation details are deferred, with this document serving as a foundational specification.

## Key Considerations

### 1. Focus Trap for Interactive Rails
When an interactive rail (e.g., the Lumin AI drawer, or any future sidebar/overlay panel requiring user input) is open, keyboard navigation must be confined within that component. This ensures an accessible and predictable user experience, preventing accidental navigation outside the active context.

**Requirements:**
-   **Activation:** When a rail component opens, focus should automatically shift to the first interactive element within it.
-   **Confinement:** Pressing `Tab` or `Shift+Tab` should cycle focus only among elements *within* the open rail.
-   **Deactivation:** When the rail closes, focus should return to the element that triggered its opening, or a logical fallback.
-   **Scope:** Applies to the Lumin drawer in `public/overlay/lifeos-app.html` and any future interactive rail components in `public/overlay/lifeos-dashboard.html` or other content frames.

### 2. ⌘K-style Command Palette Feasibility
A global command palette, activated by ⌘K (or Ctrl+K on non-Mac systems), offers a powerful way for users to quickly navigate, search, and execute actions across the LifeOS platform. This section outlines the feasibility considerations.

**Purpose:**
-   Rapid navigation to any LifeOS page/feature.
-   Quick execution of common actions (e.g., "Add MIT", "Start new chat", "Open settings").
-   Search for content or data within LifeOS.

**Activation:**
-   `⌘K` (macOS) / `Ctrl+K` (Windows/Linux) should open the command palette from anywhere within the LifeOS app chrome or dashboard content.
-   The shortcut should *not* activate if the user is actively typing in an input field or textarea, unless explicitly designed to do so (e.g., a specific command mode within an editor).

**Technical Feasibility & Design Challenges:**
-   **Global Event Listener:** A single, top-level event listener on `document` for `keydown` events, checking for `metaKey`/`ctrlKey` + `K`.
-   **UI/UX:** Design of the modal overlay, search input, and results list.
-   **Search Indexing:** How to efficiently index all navigable pages and executable actions for quick search. This might involve a client-side index or a lightweight API endpoint.
-   **Action Mapping:** A clear mechanism to map search results to JavaScript functions or URL navigation.
-   **Accessibility:** Ensure the palette is fully navigable and usable with a keyboard and screen readers.
-   **Performance:** The palette must open instantly and provide near real-time search results.

### 3. Collisions with OS/Browser Shortcuts
Implementing global shortcuts requires careful consideration of existing OS and browser keybindings to avoid conflicts and unexpected behavior.

**Known Potential Collisions:**
-   **`⌘K` (macOS/Windows/Linux):**
    -   **Browser:** Often used for "Add Link" in rich text editors (e.g., Google Docs, Notion). Less commonly a global browser shortcut.
    -   **Applications:** May be used by specific applications for various functions (e.g., "commit" in some IDEs).
-   **General Browser/OS Shortcuts:**
    -   `⌘L` / `Ctrl+L`: Focus address bar.
    -   `⌘T` / `Ctrl+T`: Open new tab.
    -   `⌘W` / `Ctrl+W`: Close current tab.
    -   `⌘R` / `Ctrl+R`: Refresh page.
    -   `⌘F` / `Ctrl+F`: Find on page.
    -   `⌘Q` / `Ctrl+Q`: Quit application (macOS/Linux).
    -   `Spacebar`: Currently used for "Push-to-talk" in Lumin chat. This is an existing custom shortcut that needs to be respected.

**Mitigation Strategies:**
-   **Prioritization:** Browser/OS shortcuts should generally take precedence over LifeOS custom shortcuts, especially for fundamental browser functions (e.g., `⌘L`, `⌘T`, `⌘W`, `⌘R`, `⌘F`).
-   **Contextual Activation:** Custom shortcuts should ideally only activate when the LifeOS application is the active window/tab and the focus is not within a standard text input field (unless the shortcut is specifically for that input).
-   **User Customization (Future):** Consider allowing users to customize or disable specific LifeOS shortcuts if conflicts become a significant issue.
-   **Documentation:** Clearly document all custom shortcuts within the application's help or settings.

## Next Steps (Deferred Implementation)
1.  **Design Mockups:** Create UI/UX mockups for the command palette.
2.  **Technical Spike:** Prototype the global event listener and basic palette rendering to assess performance and initial collision behavior.
3.  **Action Inventory:** Compile a comprehensive list of all navigable pages and actionable commands within LifeOS that should be accessible via the palette.
4.  **Accessibility Audit:** Ensure the proposed focus trap and command palette designs meet WCAG accessibility guidelines.