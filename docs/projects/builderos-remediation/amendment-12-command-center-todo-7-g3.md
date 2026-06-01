# BuilderOS Remediation: AMENDMENT_12_COMMAND_CENTER - Site Builder UI Panel (G3)

This memo addresses the `[needs-review]` status of the "Site Builder UI panel" task within `AMENDMENT_12_COMMAND_CENTER.md`, providing a builder-ready enhancement plan for the smallest buildable slice.

## 1. Blocking Ambiguity or Founder Decision List

The core ambiguity lies in the specific functionality and scope of the "Site Builder UI panel." Before proceeding with feature implementation, the following require founder decisions:

*   **Panel Purpose & Scope:** Is this a new site creation wizard, a site settings editor, a page layout builder, or a component configuration interface?
*   **Integration Point:** Where exactly within the existing Command Center navigation structure should this panel reside? (e.g., new top-level menu item, sub-item under "Settings", or a dedicated "Sites" section).
*   **Data Model Interaction:** What specific data entities (e.g., `SiteConfig`, `PageLayout`, `ComponentProps`) will this panel read from/write to?
*   **UI/UX Design:** Are there wireframes or mockups available for the panel's layout, controls, and overall user experience?
*   **Existing Feature Overlap:** Does this panel replace, extend, or complement any existing site configuration features?

## 2. Already-Settled Constraints

*   **Platform Integration:** Must integrate seamlessly into the existing LifeOS Command Center UI framework (Node/ESM, React-based).
*   **No User-Facing Changes:** No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Existing Patterns:** Adhere to established Node/ESM coding patterns and architectural principles.
*   **Extension, Not Rebuild:** Leverage and extend existing Command Center components and services where applicable, rather than rebuilding functionality.
*   **Security & Permissions:** Any new routes or data access must respect existing Command Center authorization and authentication mechanisms.

## 3. Smallest Buildable Next Slice

The smallest buildable slice, given the `[needs-review]` status, is to establish the structural placeholder for the "Site Builder UI panel" within the Command Center. This includes:

*   **Route Definition:** Define a new, accessible route for the panel within the Command Center.
*   **Navigation Link:** Add a placeholder navigation item in the Command Center UI that links to this new route.
*   **Placeholder Component:** Create a minimal React component that renders a clear "Site Builder Panel: Awaiting Specification" message. This component will serve as the entry point for future feature development.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/command-center/routes/index.js`: Add a new route definition for `/command-center/site-builder`.
*   `src/command-center/components/Navigation/CommandCenterNav.jsx`: Add a new `<NavLink>` or similar component for "Site Builder" pointing to the new route.
*   `src/command-center/pages/SiteBuilderPage.jsx`: Create this new file to house the placeholder component.
*   `src/command-center/pages/SiteBuilderPage.module.css`: Create this new file for basic styling of the placeholder.

## 5. Required Verifier/Runtime Checks

*   **Route Accessibility:** Verify that navigating to `/command-center/site-builder` displays the placeholder component.
*   **Navigation Functionality:** Confirm that clicking the "Site Builder" link in the Command Center navigation correctly loads the placeholder panel.
*   **No Regressions:** Ensure no existing Command Center routes, components, or navigation elements are negatively impacted.
*   **Console Errors:** Check the browser console for any JavaScript or React errors related to the new components or routes.

## 6. Stop Conditions

This slice is complete when:

*   A new route `/command-center/site-builder` is successfully defined and accessible.
*   A "Site Builder" navigation item is present in the Command Center UI.
*   Clicking the navigation item renders a basic `SiteBuilderPage.jsx` component displaying "Site Builder Panel: Awaiting Specification" or similar placeholder text.
*   All verifier/runtime checks pass, and no regressions are introduced.
*   The blocking ambiguities listed in Section 1 are clearly documented and awaiting founder input.