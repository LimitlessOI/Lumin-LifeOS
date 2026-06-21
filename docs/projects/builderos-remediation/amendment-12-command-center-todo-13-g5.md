<!-- SYNOPSIS: BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5 (Project Card Tooltip) -->

# BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5 (Project Card Tooltip)

This memo outlines the next buildable slice for implementing the "Hover on project card shows tooltip with focus + last worked" feature within BuilderOS, as per `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.

---

## 1. Blocking Ambiguity or Founder Decision List

*   **Definition of "Focus":**
    *   How is a project's "focus" determined? Is it a boolean flag (`isFocused`), a specific project ID set by the user, or derived from recent activity/engagement?
    *   Where is this "focus" state stored (e.g., user preferences, project metadata)?
    *   What is the display format for "focus" in the tooltip (e.g., "Focused: Yes", "Current Focus")?
*   **Source of "Last Worked" Data:**
    *   Is there an existing `last_activity_at` or similar timestamp field on the project entity in the database?
    *   If not, what constitutes "last worked" (e.g., last commit, last task update, last build)? How is this timestamp generated and stored?
    *   What is the display format for "last worked" (e.g., "2 days ago", "Yesterday at 3 PM")?
*   **Tooltip Styling and Positioning:**
    *   Should the tooltip leverage an existing UI library's tooltip component (e.g., Radix UI, Chakra UI, Ant Design) or require a custom implementation?
    *   What are the specific visual design requirements (e.g., background color, text color, font size, padding, arrow indicator)?
    *   What is the preferred positioning relative to the project card (e.g., top, bottom, left, right, auto-adjust)?

## 2. Already-Settled Constraints

*   The feature is exclusively for the BuilderOS platform; no modifications to LifeOS user features or TSOS customer-facing surfaces.
*   The interaction is a standard hover-triggered tooltip on an existing project card UI component.
*   The tooltip must convey information related to a project's "focus" and "last worked" status.
*   The implementation should adhere to existing BuilderOS UI patterns and component structures.

## 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on establishing the UI interaction and component integration without resolving data sourcing or specific formatting.

1.  **Identify Project Card Component:** Locate the primary UI component responsible for rendering individual project cards in BuilderOS.
2.  **Integrate Generic Tooltip:** Add a basic, functional tooltip component to the identified project card component. This tooltip should appear on hover and disappear on mouse leave.
3.  **Placeholder Content:** Populate the tooltip with static, placeholder text for "focus" (e.g., "Focus: [Decision Pending]") and "last worked" (e.g., "Last Worked: [Data Source Pending]").
4.  **Basic Styling:** Apply minimal styling to make the tooltip visible and readable, leveraging existing