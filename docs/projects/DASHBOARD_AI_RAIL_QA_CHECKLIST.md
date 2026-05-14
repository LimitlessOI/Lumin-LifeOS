The `DASHBOARD_AI_RAIL_CONTRACT.md` file is missing, so the checklist is drafted against the explicit fallback items provided in the task.

1.  **Dock Toggle Functionality**
    *   Verify the "↕" button (`#lifeos-ai-rail-dock-toggle`) is present in the AI Rail header.
    *   Click the "↕" button:
        *   Confirm the AI Rail visually moves between the bottom and top of the viewport.
        *   Confirm the `data-dock` attribute on `.lifeos-ai-rail-container` correctly toggles between "bottom" and "top".
        *   Ensure the UI elements within the rail (header, transcript, input) remain correctly positioned and styled after toggling.

2.  **Persistence of State (Session Storage)**
    *   **Expanded State:**
        *   Expand the AI Rail using the "↔" button (`#lifeos-ai-rail-expand-toggle`).
        *   Refresh the page.
        *   Verify the AI Rail remains in the expanded state.
        *   Collapse the AI Rail.
        *   Refresh the page.
        *   Verify the AI Rail remains in the collapsed state.
    *   **Dock Position:**
        *   Set the AI Rail to the "top" dock position using the "↕" button.
        *   Refresh the page.
        *   Verify the AI Rail remains docked at the "top".
        *   Set the AI Rail to the "bottom" dock position.
        *   Refresh the page.
        *   Verify the AI Rail remains docked at the "bottom".
    *   Verify that `sessionStorage` keys `lifeos-ai-rail:expanded` and `lifeos-ai-rail:dock-position` are correctly updated and read.

3.  **Keyboard Interaction**
    *   **Collapsed Input:**
        *   With the AI Rail collapsed, click or tab-focus the "Quick chat with Lumin..." input field (`.lifeos-ai-rail-input-collapsed`).
        *   Verify that the main dashboard chat input (`#chat-input`) receives focus.
        *   If `_focusChatInputCallback` is not set, verify that `/overlay/lifeos-chat.html` is navigated to.
    *   **Expanded Input:**
        *   With the AI Rail expanded, click or tab-focus the "Chat with Lumin..." textarea (`.lifeos-ai-rail-input-expanded`).
        *   Verify that the main dashboard chat input (`#chat-input`) receives focus.
        *   If `_focusChatInputCallback` is not set, verify that `/overlay/lifeos-chat.html` is navigated to.
    *   **Main Chat Input (after rail interaction):**
        *   After focusing the main chat input via the rail, type a message and press Enter.
        *   Verify the message is sent and a reply is received in the main chat.
    *   **Push-to-Talk Hint:**
        *   Observe the "Hold Space to talk" hint near the main chat's mic button.
        *   Verify that holding the Spacebar activates the microphone (if voice chat is enabled and configured).

4.  **Reduced Motion (Accessibility)**
    *   Enable "Reduce motion" in system accessibility settings (e.g., macOS: Display > Reduce motion; Windows: Display > Show animations in Windows).
    *   Toggle the AI Rail's expanded/collapsed state and dock position.
    *   Observe the transitions:
        *   Confirm that animations (e.g., `transform`, `height` transitions) are either removed or significantly reduced/faded, rather than abrupt jumps. (Note: Current CSS does not explicitly handle `prefers-reduced-motion`, so default browser behavior or lack of specific handling should be observed).

5.  **Mobile Safe Area Support**
    *   Test on a mobile device or emulator with a notch/dynamic island (e.g., iPhone X, 14 Pro).
    *   **Docked Bottom:**
        *   Verify the AI Rail, when docked at the bottom, correctly respects `env(safe-area-inset-bottom)`, ensuring content is not obscured by the home indicator or bottom system UI.
        *   The rail's content should appear above the safe area.
    *   **Docked Top:**
        *   Verify the AI Rail, when docked at the top, correctly respects `env(safe-area-inset-top)`, ensuring content is not obscured by the notch/status bar.
        *   The rail's content should appear below the safe area.
    *   Rotate the device between portrait and landscape orientations and verify safe area adjustments are dynamic.