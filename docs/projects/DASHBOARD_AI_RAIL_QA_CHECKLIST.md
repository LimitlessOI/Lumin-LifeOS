1. Verify the AI Rail mounts correctly on page load, creating the `#lifeos-ai-rail-root` element.
2. Confirm the AI Rail's initial state (expanded/collapsed, dock position) is loaded from `sessionStorage` using keys `lifeos-ai-rail:expanded` and `lifeos-ai-rail:dock`.
3. Test the "Expand" button:
    a. When collapsed, clicking "Expand" should expand the rail.
    b. The button text should change to "Collapse".
    c. The `aria-expanded` attribute should update to `true`.
    d. The expanded state should persist across page refreshes.
4. Test the "Collapse" button:
    a. When expanded, clicking "Collapse" should collapse the rail.
    b. The button text should change to "Expand".
    c. The `aria-expanded` attribute should update to `false`.
    d. The collapsed state should persist across page refreshes.
5. Test the "Dock Top" / "Dock Bottom" button:
    a. Clicking the button should toggle the rail's position between the top and bottom of the viewport.
    b. The button text should update to reflect the next dock position.
    c. The dock position should persist across page refreshes.
    d. Verify the `box-shadow` and `border-radius` adapt correctly for top and bottom docking.
6. Verify the "Open Lumin Chat" button:
    a. If `focusChatInputCallback` is provided during `mount`, it should be invoked.
    b. Otherwise, if an element with `id="chat-input"` exists, it should be focused and scrolled into view.
    c. As a fallback, a new window should open to `/overlay/lifeos-chat.html`.
7. Test reduced motion preference:
    a. Toggle the system's "prefers-reduced-motion" setting.
    b. Verify that transitions (expand/collapse, dock position change) are disabled when reduced motion is preferred.
    c. Verify transitions are re-enabled when reduced motion is not preferred.
8. Verify mobile safe-area handling:
    a. On devices/emulators with safe-area insets, confirm the rail respects `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` for padding.
9. Verify theme changes:
    a. Change the `data-theme` attribute on `document.documentElement`.
    b. Confirm the rail's visual styling (colors, borders) updates automatically via CSS variables without requiring a page reload or explicit JS intervention.
10. Ensure the rail's `z-index` (1000) keeps it above other page content.
11. Verify `pointer-events: none` on the container allows clicks to pass through when not interacting with the panel, and `pointer-events: auto` on the panel re-enables interaction.