BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5 (Project Card Tooltip)
This memo outlines the next buildable slice for implementing the project card tooltip feature as described in `AMENDMENT_12_COMMAND_CENTER.md`.

---

1. Blocking Ambiguity or Founder Decision List
-   **Data Source & Type for 'focus'**: What is the exact data source for "focus" (e.g., `Project` model, `UserProject` preferences, derived metric)? What is its expected data type (e.g., string, number, boolean, timestamp)?
-   **Data Source & Type for 'last worked'**: What is the exact data source for "last worked" (e.g., activity log, `Project` model timestamp)? What is its expected data type (e.g., timestamp, duration string)?
-   **Tooltip Content & Formatting**: What is the precise text, labels (e.g., "Focus:", "Last Worked:"), and formatting required for the 'focus' and 'last worked' data within the tooltip? (e.g., "Focus: [Value]", "Last Worked: [Relative Time]")
-   **Project Card Component Identification**: Confirm the exact file path and component name for the "project card" to be modified. (e.g., `src/components/ProjectCard.vue`, `src/ui/ProjectCard.tsx`)
-   **Tooltip Library/Pattern**: Is there an existing tooltip component or library used in BuilderOS, or should a new one be implemented? If new, what are the styling guidelines?

2. Already-Settled Constraints
-   **Target**: Implement a tooltip on hover for an existing "project card" UI component within BuilderOS.
-   **Content**: The tooltip must display information related to "focus" and "last worked" for the specific project card being hovered.
-   **Trigger**: The tooltip should appear on mouse hover over the project card.
-   **Scope**: Changes are limited to BuilderOS UI components; no modification to LifeOS user features or TSOS customer-facing surfaces.

3. The Smallest Buildable Next Slice
-   **Objective**: Identify the primary project card component and integrate a basic, static tooltip on hover.
-   **Steps**:
    1.  Locate the main project card component file (e.g., `src/components/ProjectCard.vue`).
    2.  Add a simple, static tooltip to the project card element. This could be:
        *   Using a native HTML `title` attribute (e.g., `<div title="Project Info Placeholder">...</div>`).
        *   Integrating an existing BuilderOS tooltip component if one is readily available and its usage pattern is clear.
        *   If no existing component, implement a minimal CSS-driven tooltip with static text.
    3.  Ensure the tooltip appears on hover and disappears on mouse leave.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/components/ProjectCard.vue` (or equivalent, pending decision from #1)
-   `src/styles/components/_project-card.scss` (or equivalent, if new styling is required for a custom tooltip)
-   `src/views/CommandCenter.vue` (or equivalent, if the project card is rendered directly here and needs context)

5. Required Verifier/Runtime Checks
-   **UI Test (Manual/Automated)**: Verify that hovering over any project card in the Command Center UI displays a tooltip.
-   **Content Test**: Verify the tooltip displays the static placeholder text (e.g., "Project Info Placeholder").
-   **No Regression**: Ensure existing project card functionality (e.g., click actions, visual layout) and styling are unaffected.
-   **Performance**: Confirm no noticeable performance degradation when hovering multiple cards.

6. Stop Conditions
-   The identified project card component successfully renders a basic, static tooltip on hover.
-   The exact file path for the project card component is confirmed and documented.
-   The chosen tooltip implementation (native `title`, existing component, or minimal custom CSS) is integrated without breaking existing UI or introducing new visual defects.
-   The blocking ambiguities listed in Section 1 are clearly articulated and ready for founder decision.