The specification is incomplete as `docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md` is missing, which the task states should be the basis for the checklist if injected files are missing. Proceeding with the explicit checklist items provided in the "Else" clause.
---
1.  **Dock Toggle Functionality**
    *   Verify the "↕" button (`#lifeos-ai-rail-dock-toggle`) is present in the AI Rail header.
    *   Click the "↕" button: Observe if the AI Rail smoothly transitions between `data-dock="bottom"` and `data-dock="top"` positions.
    *   Visually confirm the rail's position and styling (e.g., border, shadow) correctly update for both top and bottom docks.

2.  **Persistence Keys (Session Storage)**
    *   Set the AI Rail to an expanded state and a specific dock position (e.g., expanded, docked top).
    *   Refresh the browser page.
    *   Verify that the AI Rail retains its expanded state and dock position after the refresh.
    *   Close the browser tab/window and reopen it (or clear session storage).
    *   Verify that the AI Rail reverts to its default state (collapsed, docked bottom) as session storage would be cleared.

3.  **Keyboard Interaction**
    *   **Collapsed Input:**
        *   Focus the "Quick chat with Lumin..." input field (`.lifeos-ai-rail-input-collapsed`) using keyboard navigation (e.g., Tab key).
        *   Press Enter or click the input: Verify that the main dashboard chat input (`#chat-input`) gains focus, or the full chat page (`/overlay/lifeos-chat.html`) opens if `_focusChatInputCallback` is not set.
        *   Type text into the collapsed input: Verify that no message is sent directly from the rail itself.
    *   **Expanded Input:**
        *   Expand the AI Rail.
        *   Focus the "Chat with Lumin..." textarea (`.lifeos-ai-rail-input-expanded`) using keyboard navigation.
        *   Press Enter or click the textarea: Verify that the main dashboard chat input (`#chat-input`) gains focus, or the full chat page (`/overlay/lifeos-chat.html`) opens.
        *   Type text into the expanded input: Verify that no message is sent directly from the rail itself.
    *   Verify that all interactive elements within the AI Rail (toggle buttons, inputs) are reachable and operable via keyboard navigation.

4.  **Reduced Motion Preference**
    *   Enable "Reduce motion" in the operating system or browser accessibility settings.
    *   Interact with the AI Rail (expand/collapse, toggle dock position).
    *   Observe if the transitions (`transform`, `height`, `border-color`, `box-shadow`) are either removed or significantly reduced in duration/intensity. (Based on current CSS, transitions are present and not explicitly reduced, so the expected outcome is that motion is *not* reduced).
    *   Confirm that the UI remains functional and readable without motion.

5.  **Mobile Safe-Area Insets**
    *   Open the dashboard on a mobile device or in a browser's developer tools with a mobile viewport (e.g., iPhone X, with notch/dynamic island).
    *   **Docked Bottom:**
        *   Set the AI Rail to `data-dock="bottom"`.
        *   Verify that the rail's content is not obscured by the device's safe area (e.g., home indicator on iOS) and `padding-bottom: env(safe-area-inset-bottom);` is correctly applied.
    *   **Docked Top:**
        *   Set the AI Rail to `data-dock="top"`.
        *   Verify that the rail's content is not obscured by the device's safe area (e.g., status bar, notch) and `padding-top: env(safe-area-inset-top);` is correctly applied.
    *   Rotate the device/viewport: Verify that safe area adjustments update dynamically.