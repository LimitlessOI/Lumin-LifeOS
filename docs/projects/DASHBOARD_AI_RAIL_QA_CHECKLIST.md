1.  **Dock Toggle Functionality**
    *   Verify clicking the dock button (⬆/⬇) correctly switches the AI rail's position between the top and bottom of the viewport.
    *   Verify the dock button's icon and title update accurately to reflect the *next* available dock position.
    *   Verify the rail's visual positioning (e.g., `margin-top`, `margin-bottom`) adjusts correctly based on the dock state.

2.  **Persistence of State**
    *   Verify the AI rail's dock position (`lifeos-ai-rail:dock-position`) persists across page refreshes and browser tab reloads using `sessionStorage`.
    *   Verify the AI rail's expanded/collapsed state (`lifeos-ai-rail:expanded-state`) persists across page refreshes and browser tab reloads using `sessionStorage`.
    *   Verify that if `sessionStorage` keys are absent, the rail defaults to the bottom dock position and collapsed state.

3.  **Keyboard Accessibility**
    *   Verify all interactive elements within the AI rail (toggle button, dock button, open chat button, input textarea, collapsed header) are focusable via the Tab key.
    *   Verify pressing Enter or Space on a focused button triggers its intended action (expand/collapse, dock toggle, open chat).
    *   Verify the input textarea allows text entry when focused.

4.  **Reduced Motion Preference**
    *   Activate the "prefers-reduced-motion: reduce" setting in browser developer tools or OS accessibility settings.
    *   Verify that the expand/collapse transition animation for the AI rail is disabled or significantly reduced.
    *   Deactivate the "prefers-reduced-motion" setting and verify the smooth transition animation is re-enabled.

5.  **Mobile Safe-Area Handling**
    *   Test the AI rail on a mobile device or emulator with a display notch/cutout.
    *   Verify that when docked to the bottom, the rail's `padding-bottom` correctly utilizes `env(safe-area-inset-bottom)` to avoid being obscured by the device's safe area.
    *   Verify that when docked to the top, the rail's `padding-top` correctly utilizes `env(safe-area-inset-top)` to avoid being obscured by the device's safe area.
    *   Verify the rail's horizontal padding (`padding: 0 var(--dash-space-unit);`) maintains appropriate spacing from screen edges on various mobile viewports.

6.  **Collapsed/Expanded Toggle**
    *   Verify clicking the collapsed rail's header expands the rail.
    *   Verify clicking the toggle button (▲/▼) in the expanded state collapses the rail.
    *   Verify the toggle button's icon and title update correctly (▲ for expand, ▼ for collapse).
    *   Verify the expanded content (transcript, input area) is hidden when collapsed and visible when expanded.

7.  **Open Full Chat Functionality**
    *   Verify clicking the "Open full chat" button (💬) attempts to focus the existing dashboard chat input (`#chat-input`).
    *   If the `#chat-input` element is not found, verify that clicking the button opens `/overlay/lifeos-chat.html` in a new browser tab or window.