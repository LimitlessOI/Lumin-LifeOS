# BuilderOS Remediation: Amendment 12 Command Center - Pending Adam Panel (G5)

## Blueprint Enhancement Memo

This memo addresses the "Pending Adam panel shows count badge and items sorted by priority" task from `AMENDMENT_12_COMMAND_CENTER.md`. The goal is to define the smallest buildable slice to progress this feature.

### 1. Blocking Ambiguity or Founder Decision List

*   **Adam Item Definition:** What specific data fields constitute an "Adam item"? (e.g., `id`, `title`, `description`, `priority`, `status`, `assignedTo`, `dueDate`).
*   **"Pending" Criteria:** What exact `status` or other field values define an item as "Pending"?
*   **Panel Location/Integration:** Is the "Adam Panel" a new top-level section, a tab within an existing panel, or a sub-component?
*   **Priority Scale:** What is the range and meaning of "priority"? (e.g., 1-5, low/medium/high, numerical ascending/descending for sorting).
*   **Data Source:** Where do "Adam items" originate? (e.g., specific API endpoint, existing database table, derived from other entities).
*   **Interaction Model:** What actions are possible on a listed item? (e.g., click to view details, mark complete, reassign). This slice will only focus on display.

### 2. Already-Settled Constraints

*   The feature is part of the Command Center UI.
*   A dedicated panel or section for "Adam" related items is required.
*   This panel must display a numerical count badge.
*   The panel must list individual "Adam" items.
*   The listed items must be sorted based on a "priority" attribute.

### 3. The Smallest Buildable Next Slice

The smallest buildable slice focuses on rendering a static representation of the panel with mock data.

1.  **Define Mock Data:** Create a simple array of JavaScript objects representing "Pending Adam" items, including `id`, `title`, `priority` (e.g., 1-5), and a `status` field set to "pending".
2.  **Create `AdamPanel` Component:** Develop a new React component (`AdamPanel.jsx`) that consumes this mock data.
3.  **Display Count Badge:** Within `AdamPanel`, render a static count badge (e.g., `5`) or derive it from the mock data length.
4.  **Render Sorted List:** Iterate over the mock data, sort it by the `priority` field, and display each item's `title` and