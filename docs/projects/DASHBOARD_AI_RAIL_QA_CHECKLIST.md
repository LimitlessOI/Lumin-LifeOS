1.  **Collapsed one-line strip and expanded transcript panel.**
    *   Verify the AI Rail initially displays as a collapsed one-line strip.
    *   Verify the AI Rail can be expanded to reveal a full transcript panel.
    *   Verify the collapsed strip is hidden when the panel is expanded.

2.  **Dock-top and dock-bottom variants.**
    *   Verify the AI Rail can be positioned (docked) at the bottom of the viewport.
    *   Verify the AI Rail can be positioned (docked) at the top of the viewport.
    *   Verify the UI correctly updates when switching between dock positions.

3.  **Respects safe-area insets for mobile/notched devices.**
    *   Verify the AI Rail's bottom padding adjusts for `safe-area-inset-bottom` when docked at the bottom.
    *   Verify the AI Rail's top padding adjusts for `safe-area-inset-top` when docked at the top.

4.  **Utilizes token variables from public/shared/lifeos-dashboard-tokens.css.**
    *   Verify that styling (e.g., colors, spacing, borders, radii) uses CSS custom properties (e.g., `var(--dash-surface)`, `var(--dash-space-unit)`).

5.  **Class names are prefixed with `lifeos-ai-rail-`.**
    *   Verify all custom CSS class names used for the AI Rail component begin with the `lifeos-ai-rail-` prefix.