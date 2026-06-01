BuilderOS Remediation: Amendment 12 Command Center - Project Card Details Drawer (TODO-14-G5)
This memo outlines the next buildable slice for implementing the "Click on project card opens drawer with full details" task from Amendment 12 Command Center blueprint.

1. Blocking Ambiguity or Founder Decision List
-   **Drawer Content Specification:** What specific project data fields (e.g., name, ID, status, description) should be displayed in the drawer? Is there an existing API endpoint for "full details" or does one need to be defined/extended?
-   **Drawer Component Reusability:** Should a generic `Drawer` component be used/extended, or is a new `ProjectDetailsDrawer` component required?
-   **Drawer Interaction:** How should the drawer be dismissed (e.g., close button, click outside, ESC key)?

2. Already-Settled Constraints
-   **Scope:** BuilderOS-only governed loop execution. No modification of LifeOS user features or TSOS customer-facing surfaces.
-   **Blueprint Core:** A click on any project card must open a drawer.
-   **Drawer Purpose:** The drawer must display "full details" of the clicked project (content TBD by founder decision).
-   **Implementation:** Adhere to existing Node/ESM patterns and extend, not rebuild.

3. The Smallest Buildable Next Slice
Implement the basic interaction flow:
a.  Identify and modify the `ProjectCard` component to be clickable.
b.  On click, capture the `projectId` from the card.
c.  Introduce state management in the parent `CommandCenterDashboard` to control drawer visibility and pass the `projectId`.
d.  Render a new `ProjectDetailsDrawer` component, initially displaying only the `projectId` as a placeholder, when the state indicates it should be open.
e.  Implement a basic mechanism to close the drawer.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/features/command-center/components/ProjectCard.jsx`: Add `onClick` handler to trigger drawer open.
-   `src/features/command-center/components/ProjectDetailsDrawer.jsx`: Create new component for the drawer, accepting `projectId` and `onClose` props.
-   `src/features/command-center/pages/CommandCenterDashboard.jsx`: Manage `isDrawerOpen` and `selectedProjectId` state. Render `ProjectDetailsDrawer` conditionally.
-   `src/features/command-center/types.js` (if new types are needed for drawer props).

5. Required Verifier/Runtime Checks
-   **Interaction Test:** Clicking any `ProjectCard` instance successfully opens the `ProjectDetailsDrawer`.
-   **Data Pass-through Test:** The opened `ProjectDetailsDrawer` correctly displays the `projectId` of the clicked card.
-   **Closure Test:** The drawer can be closed via the implemented mechanism (e.g., a close button).
-   **No Regressions:** Existing Command Center functionality remains intact. No console errors.

6. Stop Conditions
-   A functional `ProjectDetailsDrawer` component is rendered and visible upon clicking a `ProjectCard`.
-   The drawer displays the `projectId` of the selected card as a placeholder.
-   The drawer can be dismissed.
-   All modifications are contained within the specified safe-scope files and adhere to existing code patterns.