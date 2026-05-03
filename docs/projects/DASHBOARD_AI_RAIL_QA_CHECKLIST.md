The specification is incomplete/contradictory regarding the source for the checklist when the contract Markdown is missing. Proceeding with the explicit list provided in the task.

1.  **Dock Toggle Functionality**
    *   Expand the AI Assistant rail by clicking the collapsed strip or the expand button.
    *   Locate and click the "Toggle dock position" button (SVG with vertical and horizontal lines) in the expanded header.
    *   **Expected:** The AI rail should smoothly transition from its current docked position (bottom or top) to the opposite position.
    *   **Expected:** The visual styling (e.g., border-radius, box-shadow) should update correctly for the new dock position.

2.  **State Persistence (Session Storage)**
    *   Set the AI rail to an expanded state and dock it to the 'top' position.
    *   Reload the page.
    *   **Expected:** The AI rail should reappear in the expanded state and docked at the top.
    *   Repeat the test: set the AI rail to a collapsed state and dock it to the 'bottom' position. Reload the page.
    *   **Expected:** The AI rail should reappear in the collapsed state and docked at the bottom.

3.  **Keyboard Interaction (Enter Key)**
    *   Expand the AI rail.
    *   Type a message into the input field (`Ask Lumin a quick question...`).
    *   Press the `Enter` key.
    *   **Expected:** The message should be transferred to the main dashboard chat input, the AI rail's input field should clear, and the AI rail should collapse.
    *   **Expected:** The main dashboard chat input should receive the text and gain focus.

4.  **Reduced Motion Preference**
    *   Enable "Reduce motion" in your operating system's accessibility settings.
    *   Reload the dashboard page.
    *   Expand and collapse the AI rail.
    *   Toggle the dock position of the AI rail.
    *   **Expected:** All transitions (expansion, collapse, dock position change) should occur instantly without animation.
    *   Disable "Reduce motion" and repeat the steps.
    *   **Expected:** Transitions should now be smooth animations.

5.  **Mobile Safe Area Insets**
    *   Open the dashboard on a mobile device with a notch/dynamic island or use browser developer tools to simulate a mobile viewport with safe area insets (e.g., iPhone 14 Pro).
    *   Dock the AI rail to the bottom.
    *   **Expected:** The bottom of the collapsed AI rail should respect `env(safe-area-inset-bottom)`, ensuring content is not obscured by system UI.
    *   Dock the AI rail to the top.
    *   **Expected:** The top of the collapsed AI rail should respect `env(safe-area-inset-top)`.
    *   Expand the AI rail to full screen on mobile.
    *   **Expected:** The expanded rail should correctly use `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` to avoid obscuring content.