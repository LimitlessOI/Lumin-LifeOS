The specification is incomplete/contradictory regarding the "injected files missing" condition when the contract Markdown itself is missing. Assuming "injected files missing" refers to the *code* files, and since they are present, the manual QA checklist is drafted against the provided code and explicit checklist items.

1.  **Dock Toggle Functionality**
    *   Verify the AI Assistant rail appears at the bottom of the screen by default.
    *   Click the "Toggle dock position" button (SVG with crosshairs) in the expanded header.
    *   Verify the rail moves to the top of the screen.
    *   Click the button again; verify it moves back to the bottom.
    *   Expand and collapse the rail in both top and bottom dock positions; ensure it expands/collapses correctly without visual glitches.

2.  **Persistence of State (Session Storage)**
    *   **Expanded State:**
        *   Expand the AI rail.
        *   Refresh the page.
        *   Verify the AI rail remains expanded.
        *   Collapse the AI rail.
        *   Refresh the page.
        *   Verify the AI rail remains collapsed.
    *   **Dock Position:**
        *   Set the AI rail to dock at the top.
        *   Refresh the page.
        *   Verify the AI rail remains docked at the top.
        *   Set the AI rail to dock at the bottom.
        *   Refresh the page.
        *   Verify the AI rail remains docked at the bottom.
    *   Verify that closing the browser tab/window and reopening it (clearing session storage) resets both states to default (collapsed, bottom dock).

3.  **Keyboard Interaction**
    *   Expand the AI rail.
    *   Type a message into the AI rail input field (`lifeos-ai-rail-input-field`).
    *   Press `Enter`.
    *   Verify the message is transferred to the main dashboard chat input (`chat-input`).
    *   Verify the AI rail input field is cleared.
    *   Verify the AI rail collapses.
    *   Verify the main dashboard chat input is focused.
    *   (If `window.sendChat` is available and works) Verify `sendChat()` is triggered on the main dashboard.

4.  **Reduced Motion Preference**
    *   **Test 1 (No Reduced Motion):**
        *   Ensure your OS/browser setting for "prefers-reduced-motion" is *off*.
        *   Expand and collapse the AI rail.
        *   Verify smooth transition animations are present for height and position changes.
    *   **Test 2 (With Reduced Motion):**
        *   Enable "prefers-reduced-motion" in your OS/browser settings.
        *   Refresh the page.
        *   Expand and collapse the AI rail.
        *   Verify that transitions are instant or significantly reduced, without smooth animations.

5.  **Mobile Safe Area Insets**
    *   Open the dashboard on a mobile device (or use browser dev tools to simulate a mobile device with a notch/safe area).
    *   **Docked Bottom:**
        *   Verify the collapsed AI rail at the bottom has appropriate padding (`env(safe-area-inset-bottom)`) to avoid being obscured by the home indicator or other system UI.
        *   Expand the rail; verify the expanded rail also respects `env(safe-area-inset-bottom)`.
    *   **Docked Top:**
        *   Toggle the rail to dock at the top.
        *   Verify the collapsed AI rail at the top has appropriate padding (`env(safe-area-inset-top)`) to avoid being obscured by the status bar or notch.
        *   Expand the rail; verify the expanded rail also respects `env(safe-area-inset-top)`.
    *   Verify that the rail's content is fully visible and interactive within the safe areas in both collapsed and expanded states, and in both dock positions.
    *   (Specifically for expanded mobile full-screen): Verify that on mobile, when expanded, the rail goes full screen (`width: 100vw; height: 100vh; border-radius: 0;`) and still respects safe area insets.