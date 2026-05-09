The `docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md` file is missing, so the checklist is generated based on the provided code files.

1.  **Dock Toggle Functionality**
    *   Verify the "Toggle dock position" button (⬆/⬇ icon) correctly switches the AI Rail between `data-dock="bottom"` and `data-dock="top"`.
    *   Confirm the visual styling (e.g., border-radius, padding) changes appropriately for top vs. bottom docking.
    *   Check that the toggle button's icon updates to reflect the new dock position.
2.  **Persistence of State**
    *   **Expanded State:** Expand/collapse the AI Rail, then refresh the page. Verify the rail retains its expanded/collapsed state.
    *   **Dock Position:** Change the dock position (top/bottom), then refresh the page. Verify the rail retains its dock position.
    *   Confirm these states are stored in `sessionStorage` under `lifeos-ai-rail:isExpanded` and `lifeos-ai-rail:dockPosition`.
3.  **Keyboard Interaction**
    *   **Rail Input:** When the AI Rail is expanded, type into the "Ask Lumin anything..." textarea. Press `Enter` (without `Shift`). Verify that the `handleChatInteraction` function is triggered, which should expand the rail (if collapsed), focus the main dashboard chat input, and clear the rail's input.
    *   **Main Chat Input Focus:** After pressing `Enter` in the rail's input, confirm that the main dashboard's `chat-input` element receives focus and scrolls into view.
4.  **Reduced Motion Preference**
    *   Toggle the operating system's "prefers-reduced-motion" setting (e.g., in browser dev tools or OS accessibility settings).
    *   Verify that the AI Rail's expansion/collapse and dock position transitions are either disabled or significantly reduced when `prefers-reduced-motion: reduce` is active. (The `prefers-reduced-motion` class is added to the root element, but specific CSS rules for reducing motion are not present in the provided CSS, so this may require further CSS implementation to fully test).
5.  **Mobile Safe Area Insets**
    *   On a mobile device or using browser developer tools with a mobile viewport simulation (especially for devices with notches/dynamic islands):
    *   Verify that when `data-dock="bottom"`, the rail's `padding-bottom` correctly adjusts using `env(safe-area-inset-bottom)`.
    *   Verify that when `data-dock="top"`, the rail's `padding-top` correctly adjusts using `env(safe-area-inset-top)`.
    *   Confirm that the rail does not overlap with system UI elements (e.g., home indicator, status bar) when docked.