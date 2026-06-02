BuilderOS Remediation: Amendment 12 Command Center - Mobile-Responsive Layout (G3)
This memo outlines the next buildable slice for implementing mobile responsiveness in the Command Center, addressing the `[safe]` task from `AMENDMENT_12_COMMAND_CENTER.md`.

1. Blocking Ambiguity or Founder Decision List
-   Breakpoint Definitions: Confirm specific pixel values for `sm`, `md`, `lg` breakpoints if not centrally defined in `src/ui/styles/breakpoints.js` or similar.
-   Mobile Navigation Strategy: Decide on the primary mobile navigation pattern (e.g., hamburger menu, bottom tab bar, simplified header) for the Command Center.
-   Component Prioritization: Identify which Command Center widgets/modules are critical for mobile display and which can be collapsed, hidden, or simplified.
-   Touch Interaction Patterns: Clarify any specific touch-based interaction requirements beyond standard tap/scroll.

2. Already-Settled Constraints
-   LifeOS Design System: Adherence to existing LifeOS UI component library and styling guidelines.
-   CSS-in-JS/SCSS: Utilize established styling patterns (e.g., `styled-components`, `Emotion`, or SCSS modules) for responsive styles.
-   Accessibility (WCAG): Ensure touch targets are adequately sized and navigation is keyboard-accessible on mobile.
-   Performance: Layout shifts (CLS) and initial load times must remain optimal for mobile devices.

3. Smallest Buildable Next Slice
Implement a foundational responsive layout for the Command Center's main container and header. This slice focuses on:
1.  Applying media queries to the primary page layout to transition from a multi-column desktop view to a single-column mobile view.
2.  Adapting the main Command Center header to a mobile-friendly variant (e.g., collapsing navigation into a placeholder hamburger icon).
3.  Ensuring the primary content area reflows correctly on smaller screens without horizontal scrolling.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/ui/pages/CommandCenter/CommandCenterPage.jsx` (or `.tsx`)
-   `src/ui/pages/CommandCenter/CommandCenterPage.module.css` (or `.scss`, `.ts` for styled-components)
-   `src/ui/components/CommandCenter/Header/CommandCenterHeader.jsx` (or `.tsx`)
-   `src/ui/components/CommandCenter/Header/CommandCenterHeader.module.css` (or `.scss`, `.ts` for styled-components)
-   `src/ui/styles/breakpoints.js` (if creating/modifying central breakpoint definitions)

5. Required Verifier/Runtime Checks
-   Visual Inspection: Manually test the Command Center page across various viewport sizes (e.g., 320px, 375px, 768px) using browser developer tools.
-   No Horizontal Scroll: Verify that no horizontal scrollbar appears on mobile viewports.
-   Navigation Usability: Confirm the mobile header/navigation placeholder is visible and interactive (if applicable).
-   Accessibility Audit: Run Lighthouse/axe-core on mobile view to check for basic accessibility issues (e.g., touch target size).

6. Stop Conditions
-   The main Command Center page layout correctly adapts from desktop to a single-column mobile view.
-   The Command Center header displays a mobile-appropriate layout (e.g., collapsed navigation).
-   No regressions are introduced on desktop layouts.
-   All identified blocking ambiguities for this slice are resolved or explicitly documented for future phases.