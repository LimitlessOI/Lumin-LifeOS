The specification is incomplete as `docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md` is missing.

1.  **Dock Toggle Functionality**
    *   Verify the "Toggle AI Rail" button (▲/▼ icon) is present and functional, expanding and collapsing the rail.
    *   Verify the "Toggle Dock Position" button (⬆/⬇ icon) is present and functional, switching the rail between bottom and top docking positions.
    *   Observe that the icon on the dock button correctly reflects the current dock position (⬆ for bottom, ⬇ for top).

2.  **Persistence Keys**
    *   Toggle the rail's expanded/collapsed state, then refresh the page. Confirm the state persists.
    *   Toggle the rail's dock position (bottom/top), then refresh the page. Confirm the position persists.
    *   Inspect `sessionStorage` in browser developer tools to confirm `lifeos-ai-rail:expanded` and `lifeos-ai-rail:dock` keys are correctly updated and reflect the current UI state.

3.  **Keyboard Interaction**
    *   Focus the AI rail input field (`#lifeos-ai-rail-input`).
    *   Type a message and press `Enter`. Verify the message is sent (either to the main chat or as a stub within the rail), the input clears, and the rail collapses if it was expanded.
    *   When the AI rail input is focused, verify that the main dashboard chat input (`#chat-input`) also receives focus.
    *   Press and hold the `Spacebar` (outside of any input fields). Verify the microphone activates (if voice chat is enabled).
    *   Release the `Spacebar`. Verify the microphone deactivates.

4.  **Reduced-Motion Accessibility**
    *   Enable "Reduce motion" in your operating system or browser accessibility settings.
    *   Toggle the AI rail's expanded/collapsed state and dock position. Verify that all transitions are instant (no animation).
    *   Disable "Reduce motion".
    *   Toggle the AI rail's state again. Verify that transitions are smooth and animated.

5.  **Mobile Safe-Area and Responsiveness**
    *   Test on a mobile device or using browser developer tools with a device emulator (e.g., iPhone with a notch).
    *   When docked to the bottom, verify the rail's bottom edge respects `env(safe-area-inset-bottom)`, preventing content from being obscured by the home indicator.
    *   When docked to the top, verify the rail's top edge respects `env(safe-area-inset-top)`, preventing content from being obscured by the status bar/notch.
    *   On screens with a width of 600px or less, verify the rail takes up the full width of the screen and its `border-radius` is `0` (no rounded corners).
    *   On screens with a width of 600px or less, verify the rail's `max-height` is `90vh`.