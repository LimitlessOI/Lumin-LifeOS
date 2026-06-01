BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5
Blueprint Enhancement Memo

This memo outlines the necessary clarifications and the smallest buildable slice for implementing the "Hover on project card shows tooltip with focus + last worked" feature, as per `AMENDMENT_12_COMMAND_CENTER.md`.

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Definition of "Focus":** Is "focus" a numerical value (e.g., 1-5), a categorical string (e.g., "High", "Medium"), or a specific metric? Clarification needed on its data type and source within the project data model.
*   **Definition of "Last Worked":** What is the exact data format and source for "last worked"? Is it a timestamp, a relative duration (e.g., "2 days ago"), or a specific date? How should it be formatted for display?
*   **Tooltip UI/UX:** Should this be a native browser tooltip (`title` attribute) or a custom UI component for styling consistency? If custom, what are the design specifications (e.g., styling, positioning, interaction delays)?
*   **Data Source for Tooltip Content:** Where does the `ProjectCard` component retrieve "focus" and "last worked" data? Is it already part of the `project` object passed to the card, or does it require a new data fetch/prop?

### 2. Already-Settled Constraints

*   **Target Component:** The feature applies specifically to "project cards" within the BuilderOS UI.
*   **Interaction Trigger:** The tooltip must appear on hover over a project card.
*   **Content Requirement:** The tooltip must display information related to "focus" and "last worked".
*   **Scope:** Changes are strictly confined to BuilderOS UI components; no modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Minimalism:** The implementation should be as minimal as possible, extending existing patterns rather than rebuilding.

### 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on establishing the tooltip mechanism with placeholder data, deferring data integration specifics until ambiguities are resolved.

*   **Identify Project Card Component:** Locate the primary `ProjectCard` component in the BuilderOS codebase.
*   **Implement Basic Tooltip:** Add a simple tooltip mechanism to the `ProjectCard` component. Initially, this can be a native `title` attribute or a minimal custom component wrapper.
*   **Placeholder Content:** Populate the tooltip with static placeholder text for "Focus" and "Last Worked".
    *   Example: "Focus: [TBD]"
    *   Example: "Last Worked: [TBD]"
*   **No Data Integration:** This slice explicitly avoids integrating actual "focus" or "last worked" data until their definitions and sources are clarified.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

Assuming a typical component structure for BuilderOS:

*   `builder-os/src/components/ProjectCard/ProjectCard.jsx` (or `.tsx`):
    *   Modify the root element of the `ProjectCard` to include a `title` attribute for a native tooltip, or integrate a simple custom tooltip component.
*   `builder-os/src/components/ProjectCard/ProjectCard.module.css` (or `.scss`):
    *   If a custom tooltip component is used, add minimal styling for its appearance and positioning.

### 5. Required Verifier/Runtime Checks

*   **UI Verification:** On BuilderOS, navigate to a view displaying project cards. Hover over any project card.
    *   **Expected:** A tooltip appears.
    *   **Expected:** The tooltip contains the text "Focus: [TBD]" and "Last Worked: [TBD]".
*   **No Regression:** Verify that the project card's existing click behavior, styling, and data display remain unaffected.
*   **Scope Adherence:** Confirm that no files outside of the specified `builder-os/src/components/ProjectCard/` directory were modified.

### 6. Stop Conditions

*   The `ProjectCard` component in BuilderOS successfully displays a basic tooltip on hover.
*   The tooltip content includes static placeholder text for "Focus" and "Last Worked".
*   The implementation is limited to adding the tooltip mechanism and placeholder content, without attempting to fetch or display dynamic data.
*   All changes are contained within the BuilderOS UI component scope.