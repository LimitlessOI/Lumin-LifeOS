# Amendment 12 Command Center: Adam Panel Remediation (G2)

## Blueprint Enhancement Memo

This memo outlines the next buildable slice for the "Pending Adam panel" task from `AMENDMENT_12_COMMAND_CENTER.md`, focusing on displaying priority-sorted items with type badges.

### 1. Blocking Ambiguity or Founder Decision List

*   **Priority Definition:** What are the specific priority levels (e.g., P0, P1, P2; numerical; high/medium/low) and their precise sorting order?
*   **Type Badge Taxonomy:** What is the exhaustive, canonical list of valid "type badges" (e.g., Bug, Feature, Chore, Debt, Question)?
*   **Adam Panel Scope:** What defines the set of items for "Adam"? Is it all open tasks, tasks assigned to 'Adam', or tasks within a specific project/context?
*   **Data Source for Adam Panel:** What is the authoritative API endpoint or database table for fetching Adam's panel items?
*   **"One-Click Resolve" Definition:** What exact action does "one-click resolve" perform (e.g., mark complete, archive, reassign)? What are the permissions and side effects? This functionality is explicitly deferred from this slice.

### 2. Already-Settled Constraints

*   The panel is intended for "Adam" (specific user/role context).
*   Items must be displayed in a priority-sorted order.
*   Each item must display a "type badge".
*   The scope is `[safe]`, meaning no high-risk modifications to core systems.
*   BuilderOS-only governed loop execution.
*   No modification to LifeOS user features or TSOS customer-facing surfaces.
*   Estimated effort for this slice is 2 hours.

### 3. Smallest Buildable Next Slice

Implement the foundational UI for the Adam panel, displaying a static or mocked list of items. Each item will show a placeholder priority and a placeholder type badge. Sorting will be applied based on a default priority scheme. Data fetching will initially use a mock data source.

**Key Deliverables:**
*   A React/Vue component for the Adam Panel.
*   A sub-component for individual Adam Panel Items.
*   Integration of mock data for initial display.
*   Basic styling for readability.
*   Sorting logic applied to the displayed items.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/components/AdamPanel.jsx` (or `.tsx`, `.vue`): Main container for the panel.
*   `src/components/AdamPanelItem.jsx` (or `.tsx`, `.vue`): Component for rendering a single item, including priority and type badge.
*   `src/data/mockAdamPanelData.js`: A simple JavaScript file exporting an array of mock panel item objects. Each object should include `id`, `title`, `priority` (e.g., 'P1'), and `type` (e.g., 'Bug').
*   `src/styles/AdamPanel.css`: Basic styling for the panel and its items.
*   `src/utils/adamPanelService.js`: A utility to simulate fetching data, initially returning `mockAdamPanelData.js`.

### 5. Required Verifier/Runtime Checks

*   **Unit Tests:**
    *   `AdamPanel.test.js`: Verify `AdamPanel` renders without crashing and displays a list of items.
    *   `AdamPanelItem.test.js`: Verify `AdamPanelItem` correctly displays `title`, `priority`, and `type` props.
    *   `adamPanelService.test.js`: Verify the service can successfully retrieve mock data.
*   **Integration Tests:**
    *   Verify `AdamPanel` correctly fetches and displays items from `adamPanelService`, applying the specified sorting.
*   **Runtime Checks:**
    *   Panel renders without console errors.
    *   Items are visibly sorted by priority.
    *   Type badges are displayed for each item.

### 6. Stop Conditions

*   The `AdamPanel` component is implemented and renders a list of items.
*   Items are sorted by a default priority (e.g., P0 > P1 > P2).
*   Each item displays a placeholder type badge (e.g., "Bug", "Feature").
*   The panel uses mock data from `src/data/mockAdamPanelData.js`.
*   No "one-click resolve" functionality is present.
*   All specified safe-scope files are created.
*   All required verifier/runtime checks pass for this slice.