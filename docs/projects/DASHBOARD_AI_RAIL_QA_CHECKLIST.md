The specification is contradictory: it instructs to produce a checklist *only* against a contract Markdown file that is explicitly reported as missing. Given AUTONOMY MAX, it is assumed that the intent is to use the fallback checklist items provided in the "Else" clause when the contract Markdown is unavailable.

1.  **Dock Toggle Functionality**
    *   Verify that clicking the "↕" button correctly toggles the AI Rail's position between the bottom and top of the screen.
    *   Verify that the visual styling (e.g., border, shadow, corner radii) updates correctly when the rail is docked at the top versus the bottom.

2.  **Persistence of State**
    *   Verify that the expanded/collapsed state of the AI Rail persists across page refreshes (e.g., after reloading `public/overlay/lifeos-dashboard.html`).
    *   Verify that the dock position (top/bottom) of the AI Rail persists across page refreshes.

3.  **Keyboard Interaction**
    *   Verify that clicking or focusing the "Quick chat with Lumin..." input field in the collapsed AI Rail correctly focuses the main dashboard chat input (`#chat-input`).
    *   Verify that clicking or focusing the "Chat with Lumin..." textarea in the expanded AI Rail correctly focuses the main dashboard chat input (`#chat-input`).
    *   Verify that standard keyboard navigation (e.g., Tab key) correctly moves focus within the AI Rail and to/from other dashboard elements.

4.  **Reduced Motion**
    *   Verify that the AI Rail's expand/collapse and dock position transitions are smooth and do not cause visual discomfort. (Note: Explicit `prefers-reduced-motion` media queries are not present in the provided CSS, so transitions will always occur.)

5.  **Mobile Safe-Area Support**
    *   On mobile devices (especially those with notches or dynamic islands), verify that the AI Rail's content is not obscured by system UI elements when docked at the bottom (respecting `env(safe-area-inset-bottom)`).
    *   On mobile devices, verify that the AI Rail's content is not obscured by system UI elements when docked at the top (respecting `env(safe-area-inset-top)`).
    *   Verify that the overall layout and padding of the AI Rail adapt correctly to different mobile screen sizes and safe areas.