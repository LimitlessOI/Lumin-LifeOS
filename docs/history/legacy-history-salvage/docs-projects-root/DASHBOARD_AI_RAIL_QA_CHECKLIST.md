<!-- SYNOPSIS: Documentation — DASHBOARD AI RAIL QA CHECKLIST. -->

The specification is contradictory: it instructs to "produce checklist only against contract Markdown" if injected files are missing, but the contract Markdown itself is missing, making it impossible to produce a checklist *against* it. I am proceeding with the assumption that the "Else" clause provides the intended fallback checklist items.

1.  **Dock Toggle Functionality & Visuals:**
    *   Verify clicking the "↕" button toggles the AI Rail between 'bottom' and 'top' dock positions.
    *   **Critical:** Observe if the visual styling (e.g., `border-top`, `border-bottom`, `border-radius`, `box-shadow`) correctly updates according to the dock position. (Note: The JavaScript applies classes `lifeos-ai-rail-dock-top`/`bottom`, but the CSS targets `data-dock="top"`/`bottom` attributes, which is a mismatch and will likely prevent correct styling).

2.  **Persistence of State:**
    *   Toggle the AI Rail's expanded/collapsed state. Refresh the page. Verify the state persists.
    *   Toggle the AI Rail's dock position. Refresh the page. Verify the dock position persists.
    *   (Note: Persistence is expected within the same browser session as `sessionStorage` is used).

3.  **Keyboard Interaction (Input Redirection):**
    *   Click or focus the "Quick chat with Lumin..." input field in the collapsed rail. Verify it either focuses the main dashboard chat input or opens the full chat page (`/overlay/lifeos-chat.html`).
    *   Click or focus the "Chat with Lumin..." textarea in the expanded rail. Verify it either focuses the main dashboard chat input or opens the full chat page.
    *   Confirm that typing in the rail's input fields does *not* directly send messages within the rail itself, but rather redirects to the main chat.

4.  **Reduced Motion Preference:**
    *   Enable "Reduce motion" in system accessibility settings.
    *   Verify that transitions for expanding/collapsing the rail and changing its dock position are either removed or significantly reduced. (Note: Based on current CSS, no `@media (prefers-reduced-motion)` is implemented, so transitions will likely still occur).

5.  **Mobile Safe-Area Insets:**
    *   On a mobile device with a notch or dynamic island (or using browser developer tools to simulate one), set the AI Rail to `data-dock="bottom"` and `data-dock="top"`.
    *   **Critical:** Verify that the rail's content correctly pads itself to avoid being obscured by the safe areas (i.e., `padding-bottom: env(safe-area-inset-bottom)` and `padding-top: env(safe-area-inset-top)` are effective). (Note: This depends on the `data-dock` attribute being correctly applied, which is currently a mismatch with JS classes).