Amendment 12 Command Center: Project Card Drawer - G5 Remediation

This memo addresses the "Click on project card opens drawer with full details" task from the Amendment 12 Command Center blueprint. The goal is to define the smallest buildable slice to initiate the drawer interaction without violating the blueprint, specifically focusing on the interaction mechanism.

---

1.  **Blocking Ambiguity or Founder Decision List**
    *   Specific data fields required for "full details" within the drawer.
    *   Visual design system or component library to be used for the drawer component (e.g., existing UI kit, custom styling).
    *   Exact dismissal mechanisms for the drawer (e.g., ESC key, click backdrop, explicit close button).
    *   Precise component name and current props/structure of the "project card" component.

2.  **Already-Settled Constraints**
    *   BuilderOS-only governed loop execution.
    *   No modification of LifeOS user features or TSOS customer-facing surfaces.
    *   Implement exactly what the instruction asks for inside approved builder safe scope.
    *   Adherence to existing code patterns; extend, do not rebuild.
    *   Core interaction: "Click on project card opens drawer with full details."

3.  **Smallest Buildable Next Slice**
    *   **Objective:** Implement the basic interaction of opening and closing a placeholder drawer upon clicking a project card.
    *   **Steps:**
        1.  Identify the existing `ProjectCard` component (e.g., `src/components/ProjectCard.{vue,tsx}`).
        2.  Add an `onClick` handler to the `ProjectCard` component.
        3.  Introduce a state variable (e.g., `isDrawerOpen`) in the parent component rendering `ProjectCard` (e.g., `src/views/CommandCenter.{vue,tsx}`).
        4.  Pass a callback to `ProjectCard` to update `isDrawerOpen` to `true` on click.
        5.  Create a new `ProjectDetailsDrawer` component (e.g., `src/components/ProjectDetailsDrawer.{vue,tsx}`). This component will initially render a simple "Project Details Drawer Placeholder" text and a basic close button.
        6.  Conditionally render `ProjectDetailsDrawer` in the parent component based on `isDrawerOpen`.
        7.  Implement a mechanism within `ProjectDetailsDrawer` (e.g., a close button or backdrop click) to emit an event or call a prop function to set `isDrawerOpen` to `false`.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `src/components/ProjectCard.{vue,tsx}`: Add `onClick` prop and handler.
    *   `src/views/CommandCenter.{vue,tsx}`: Manage `isDrawerOpen` state, conditionally render `ProjectDetailsDrawer`, pass `onClose` handler.
    *   `src/components/ProjectDetailsDrawer.{vue,tsx}`: New component file for the drawer.

5.  **Required Verifier/Runtime Checks**
    *   **Unit/Integration Tests:**
        *   Verify `ProjectCard` emits an event or calls a prop function on click.
        *   Verify `ProjectDetailsDrawer` renders when `isDrawerOpen` is true.
        *   Verify `ProjectDetailsDrawer` emits a close event or calls a prop function when its close mechanism is activated.
    *   **E2E/UI Tests:**
        *   Click a project card: Assert drawer becomes visible.
        *   Click drawer close button/backdrop: Assert drawer becomes hidden.
    *   **Code Quality:** Linting, type checking (if TypeScript).

6.  **Stop Conditions**
    *   A placeholder drawer component successfully renders and is visible upon clicking any `ProjectCard`.
    *   The placeholder drawer can be dismissed via a defined interaction (e.g., close button).
    *   No actual project data is fetched or displayed within the drawer.
    *   No new API endpoints or complex routing logic are introduced.
    *   The implementation adheres to existing component patterns and styling conventions.