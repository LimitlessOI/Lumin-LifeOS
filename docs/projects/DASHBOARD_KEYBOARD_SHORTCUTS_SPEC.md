# Global Shortcuts for LifeOS Dashboard & App Chrome

**Date:** 2024-05-15
**Status:** Specification / Feasibility Analysis

## Goal

To define a strategy for implementing global keyboard shortcuts within the LifeOS platform, specifically for the dashboard and overall application chrome, while considering user experience, accessibility, and potential conflicts. Implementation is deferred.

## Key Areas of Analysis

### 1. ⌘K-style Command Palette Feasibility

*   **Concept:** A modal overlay activated by `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) that allows users to quickly search for and execute commands, navigate to sections, or perform actions across the LifeOS application.
*   **Feasibility:** Highly feasible and a widely adopted pattern in modern web applications for enhancing productivity for power users.
*   **Technical Considerations:**
    *   Requires a global `keydown` event listener on the `lifeos-app.html` shell.
    *   The command palette UI must be a modal component, ensuring it captures focus and prevents interaction with underlying content.
    *   Needs a robust search and filtering mechanism for available commands and navigation targets.
    *   Accessibility: Must be fully keyboard navigable, support screen readers, and adhere to WCAG guidelines for modal dialogs.
    *   Scope: Commands should ideally be context-aware but also offer global navigation and actions.

### 2. Focus Trap for AI Rail (Lumin Drawer)

*   **Concept:** When the Lumin AI rail (or any other modal/drawer component) is open, keyboard focus must be programmatically constrained within that component. This prevents users from tabbing into elements in the background application content.
*   **Necessity:** Essential for accessibility (WCAG 2.1, 2.4.3 Focus Order) to ensure a predictable and usable experience for keyboard-only users.
*   **Technical Considerations:**
    *   Identify all focusable elements within the Lumin drawer (inputs, buttons, links).
    *   On drawer open: Programmatically move focus to the first interactive element inside the drawer.
    *   On `Tab` or `Shift+Tab` key presses: Intercept the event and cycle focus only among the elements within the open drawer.
    *   On drawer close: Return focus to the element that triggered the drawer's opening, or a logical fallback element in the main application.
    *   This is a critical accessibility requirement that must be implemented for all modal-like components, including the Lumin drawer.

### 3. Collisions with OS/Browser Shortcuts

*   **General Principle:** Operating System and browser-level keyboard shortcuts take precedence and should generally not be overridden by web applications, as this can lead to a frustrating user experience.
*   **Common Conflicts to Avoid:**
    *   `⌘W` / `Ctrl+W`: Close current tab/window.
    *   `⌘T` / `Ctrl+T`: Open new tab.
    *   `⌘N` / `Ctrl+N`: Open new window.
    *   `⌘R` / `Ctrl+R`: Refresh page.
    *   `⌘L` / `Ctrl+L`: Focus address bar.
    *   `⌘F` / `Ctrl+F`: Find on page.
    *   `Spacebar`: Default browser behavior is page scrolling. LifeOS currently uses `Spacebar` for Push-to-Talk (PTT) when no input field is focused. This is a known collision point that requires careful handling (e.g., `e.preventDefault()` when PTT is active).
*   **Strategy for `⌘K` / `Ctrl+K`:** This combination is generally considered safe as it is not a primary OS or browser shortcut and is a widely accepted pattern for command palettes in web applications.
*   **Mitigation Strategies:**
    *   Prioritize modifier keys (`Shift`, `Alt`/`Option`) in combination with letters for application-specific shortcuts, especially for less common actions.
    *   Avoid remapping common `⌘`/`Ctrl` combinations that are deeply ingrained in OS/browser behavior.
    *   Consider providing user-configurable shortcut settings to allow users to customize or disable shortcuts that conflict with their personal workflow or other installed browser extensions.

## Proposed Initial Shortcuts (for discussion, implementation deferred)

*   `⌘K` / `Ctrl+K`: Open Command Palette (app-wide).
*   `Spacebar` (when no input focused): Push-to-Talk (existing functionality, to be managed within the global shortcut system).
*   `Esc`: Close any open modal, drawer, or command palette.

## Next Steps (Implementation Deferred)

*   Detailed UI/UX design for the command palette.
*   Development of a robust global shortcut manager to handle registration, conflict resolution, and user customization.
*   Implementation of focus trap logic for all modal and drawer components (e.g., Lumin drawer, settings panel).