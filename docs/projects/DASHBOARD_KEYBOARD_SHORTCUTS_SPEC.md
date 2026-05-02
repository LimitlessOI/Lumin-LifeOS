# Global Shortcuts Specification

## 1. Introduction
This document outlines the specification for global keyboard shortcuts within the LifeOS Dashboard and the main LifeOS application chrome. The goal is to enhance user efficiency and accessibility through keyboard navigation and quick actions, while carefully considering potential conflicts with operating system and browser shortcuts.

## 2. Focus Trap for AI Rail / Lumin Drawer
### Requirement
When the AI Rail (Dashboard) or Lumin Drawer (App Chrome) is open, keyboard focus must be programmatically trapped within the active overlay. This ensures that users navigating with a keyboard do not inadvertently interact with elements outside the overlay and can easily dismiss or interact with the overlay's content.

### Technical Considerations
*   **Implementation**: Use JavaScript to manage `tabindex` attributes or leverage WAI-ARIA dialog patterns.
*   **Activation/Deactivation**: The focus trap should activate upon opening the rail/drawer and deactivate upon closing.
*   **Initial Focus**: Upon opening, focus should be set to a logical interactive element within the overlay (e.g., the chat input field).
*   **Last Focus Restoration**: Upon closing, focus should ideally return to the element that had focus before the overlay was opened.

## 3. Command Palette Feasibility (⌘K-style)
### Concept
A ⌘K-style command palette would provide a quick, searchable interface for executing common actions, navigating to sections, or accessing specific features across the LifeOS platform.

### Feasibility Assessment
*   **Benefits**:
    *   **Efficiency**: Rapid access to functions without mouse interaction.
    *   **Discoverability**: Helps users find features without extensive menu navigation.
    *   **Accessibility**: Provides an alternative input method for users who prefer keyboards.
*   **Technical Feasibility**: High. Modern web applications frequently implement such palettes.
    *   **UI/UX**: Requires a modal overlay, a search input, and a dynamic list of commands.
    *   **Command Registration**: A centralized mechanism would be needed to register commands from different features/domains. Each command would need a title, an optional description, and an associated action (e.g., a function call, a navigation path).
    *   **Search Logic**: Fuzzy searching or weighted search could improve user experience.
*   **Integration Points**:
    *   **App Chrome**: The palette would likely be a global component in `lifeos-app.html`.
    *   **Dashboard**: Could also be integrated into `lifeos-dashboard.html` for dashboard-specific actions.

### Implementation Deferred
Actual implementation of the command palette is deferred, but the architectural considerations for its future integration should be kept in mind during any related UI/UX development.

## 4. Collisions with OS/Browser Shortcuts
### Overview
Global keyboard shortcuts must be chosen carefully to avoid conflicts with critical operating system (OS) and browser-level shortcuts. Overriding these can lead to a frustrating user experience or loss of functionality.

### Common OS/Browser Conflicts
The following are common shortcuts that should generally *not* be overridden by the application:

*   **Navigation/Tabs**:
    *   `⌘T` / `Ctrl+T`: New tab
    *   `⌘W` / `Ctrl+W`: Close tab
    *   `⌘N` / `Ctrl+N`: New window
    *   `⌘[` / `Ctrl+[` (or `⌘←` / `Ctrl+←`): Back in history
    *   `⌘]` / `Ctrl+]` (or `⌘→` / `Ctrl+→`): Forward in history
*   **Page Interaction**:
    *   `⌘R` / `Ctrl+R` / `F5`: Refresh page
    *   `⌘L` / `Ctrl+L`: Focus address bar
    *   `⌘F` / `Ctrl+F`: Find on page
    *   `⌘P` / `Ctrl+P`: Print page
    *   `⌘S` / `Ctrl+S`: Save page
    *   `⌘+` / `Ctrl++` (and `⌘-` / `Ctrl+-`): Zoom in/out
    *   `⌘0` / `Ctrl+0`: Reset zoom
*   **Text Editing**:
    *   `⌘C` / `Ctrl+C`: Copy
    *   `⌘X` / `Ctrl+X`: Cut
    *   `⌘V` / `Ctrl+V`: Paste
    *   `⌘A` / `Ctrl+A`: Select all
    *   `⌘Z` / `Ctrl+Z`: Undo
    *   `⌘Y` / `Ctrl+Y`: Redo
*   **Developer Tools**:
    *   `⌘⌥I` / `Ctrl+Shift+I` / `F12`: Open developer tools

### Strategy for Conflict Resolution
1.  **Prioritize OS/Browser**: For critical functions (e.g., tab management, page refresh), OS/browser shortcuts should always take precedence.
2.  **Context-Aware Shortcuts**: Implement shortcuts that are only active when specific UI elements are in focus (e.g., chat input, a specific card).
3.  **Modifier Keys**: Utilize less common modifier key combinations (e.g., `Shift+Alt+Key`, `Ctrl+Shift+Key` on Mac, or `Alt+Shift+Key` on Windows/Linux) for application-specific global shortcuts, as these are less frequently used by OS/browser.
4.  **User Customization (Future)**: Consider allowing users to customize or disable application shortcuts in future iterations.
5.  **Documentation**: Clearly document all application shortcuts for users.

### Proposed Global Shortcuts (Examples for future implementation)
*   `⌘K` / `Ctrl+K`: Open Command Palette (standard practice, generally safe as browsers don't typically use this for critical functions).
*   `Esc`: Close active modal/drawer (e.g., Lumin Drawer, Command Palette).
*   `Tab` / `Shift+Tab`: Navigate focus within active modal/drawer (when focus trap is active).