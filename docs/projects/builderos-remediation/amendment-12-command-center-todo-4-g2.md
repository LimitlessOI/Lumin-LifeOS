# BuilderOS Remediation: Amendment 12 Command Center - Adam Panel (G2)

This memo outlines the next buildable slice for the "Pending Adam panel" task from the `AMENDMENT_12_COMMAND_CENTER.md` blueprint, focusing on establishing the foundational UI elements.

## 1. Blocking Ambiguity or Founder Decision List

*   **Data Source for Adam Panel Items:**
    *   What is the API endpoint or internal service responsible for providing the list of items for the Adam panel? (e.g., `/api/v1/adam-tasks`, `/api/v1/command-center/tasks?panel=adam`).
    *   What is the exact schema of an "Adam panel item" object? (e.g., `id`, `title`, `description`, `priority`, `type`, `status`, `created_at`).
*   **Priority Levels and Sorting Logic:**
    *   What are the defined priority levels (e.g., P0, P1, P2, P3; Critical, High, Medium, Low)?
    *   What is the precise sorting order for these priorities (e.g., descending P0 to P3)?
*   **Item Types and Badge Styles:**
    *   What are the exhaustive list of possible "type" values for items (e.g., `bug`, `alert`, `incident`, `task`, `review`)?
    *   What are the corresponding visual styles (colors, icons) for each type badge?
*   **"One-Click Resolve" Action:**
    *   What API endpoint is invoked when an item is resolved? (e.g., `POST /api/v1/adam-tasks/:id/resolve`).
    *   What is the expected payload for the resolve action?
    *   Is there any confirmation dialog required before resolving an item?
    *   What is the expected state change for a resolved item (e.g., `status: 'resolved'`, removal from list)?

## 2. Already-Settled Constraints

*   The panel is specifically named "Adam panel".
*   It will display a list of actionable items.
*   Items must be visually "priority-sorted".
*   Items must display "type badges".
*   A "one-click resolve" action button must be present for each item.
*   The scope for this task is `[safe]`, implying no breaking changes to existing user flows.
*   Estimated effort for the full task is 2 hours.

## 3. Smallest Buildable Next Slice

Implement the basic UI structure for the `AdamPanel` component. This slice will:
1.  Create a new `AdamPanel` component.
2.  Integrate this component into the `CommandCenterView`.
3.  Render a static list of mock items within the `AdamPanel`.
4.