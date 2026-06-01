BuilderOS Remediation: Amendment 12 Command Center - Project Card Details Drawer (TODO-14-G5)

This memo outlines the next buildable slice for implementing the "Click on project card opens drawer with full details" task from Amendment 12 Command Center blueprint.

1.  **Blocking Ambiguity or Founder Decision List**
    *   **Drawer Content Specification:** What specific project data points (e.g., ID, name, status, description, assigned builder, due date, associated tasks) should be displayed in the "full details" drawer? Are there any interactive elements (e.g., edit button, status change, assign builder) required within the drawer for this slice?
    *   **Data Source for Details:** How are the "full details" fetched? Is there an existing API endpoint for `GET /projects/{id}` that provides all necessary data, or does one need to be defined/extended? For this slice, a mock or existing data passed down is assumed.
    *   **Drawer State Management:** How is the drawer's open/closed state and the selected project's ID managed across components? (e.g., React Context, Redux, local component state).

2.  **Already-settled Constraints**
    *   **Trigger:** User action: Click on any `ProjectCard` component.
    *   **Outcome:** A `ProjectDetailsDrawer` component opens.
    *   **Content:** The drawer must display "full details" of the clicked project. For this slice, "full details" means at least the project ID and name.
    *   **Scope:** Implementation is confined to the BuilderOS Command Center UI.
    *   **Interaction:** The drawer must have a mechanism to be closed by the user.

3.  **The Smallest Buildable Next Slice**
    *   Implement the basic UI interaction: Clicking a `ProjectCard` component triggers the opening of a `ProjectDetailsDrawer` component.
    *   The `ProjectDetailsDrawer` component, when open, will receive the `projectId` of the clicked card.
    *   The drawer will display a minimal set of project details (e.g., "Project ID: [ID]", "Project Name: [Name]") using either hardcoded mock data or data passed directly from the `ProjectCard` for the initial display.
    *   Implement a visible close button or an equivalent mechanism (e.g., click outside) for the drawer.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `src/components/ProjectCard.jsx` (or `.tsx`): Add an `onClick` handler to trigger drawer opening and pass project ID.
    *   `src/components/ProjectDetailsDrawer.jsx` (or `.tsx`): Create or modify this component to render the drawer UI, accept `projectId` and `isOpen` props, and display minimal details.
    *   `src/views/CommandCenter/ProjectsView.jsx` (or `.tsx`): Integrate the `ProjectDetailsDrawer` component and manage its `isOpen` state and the `selectedProjectId`.
    *   `src/utils/mockProjectData.js` (or `.ts`): (Optional) If no existing data source, create a simple mock data utility for initial detail display.

5.  **Required Verifier/Runtime Checks**
    *   Verify that clicking any `ProjectCard` successfully opens the `ProjectDetailsDrawer`.
    *   Verify that the `ProjectDetailsDrawer` displays at least the `projectId` and `projectName` corresponding to the clicked card.
    *   Verify that the `ProjectDetailsDrawer` can be closed by the user.
    *   Verify no regressions in existing `ProjectCard` or `ProjectsView` functionality.

6.  **Stop Conditions**
    *   A `ProjectCard` click successfully opens a `ProjectDetailsDrawer`.
    *   The `ProjectDetailsDrawer` displays a minimal set of project details (ID, Name) for the selected project.
    *   The `ProjectDetailsDrawer` can be closed by the user.
    *   No new API endpoints are required for this slice; mock data or existing data propagation is sufficient.
    *   The implementation adheres to existing UI component patterns and styling.