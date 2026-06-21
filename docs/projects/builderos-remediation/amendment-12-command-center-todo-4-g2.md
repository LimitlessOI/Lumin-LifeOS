<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Todo 4 G2. -->

Blueprint Enhancement Memo: Amendment 12 Command Center - Pending Adam Panel (G2)

This memo outlines a builder-ready enhancement for the "Pending Adam panel" task, focusing on the initial display requirements as per `AMENDMENT_12_COMMAND_CENTER.md`.

1.  **Blocking Ambiguity or Founder Decision List:**
    *   **Priority Schema:** Define the exact schema for "priority" (e.g., numeric `0-9`, enum `P0/P1/P2`, string `High/Medium/Low`).
    *   **Type Definitions:** List all possible "types" for items and their corresponding badge display rules (e.g., text, color, icon).
    *   **"One-Click Resolve" Action:** Specify the exact API endpoint, required payload, and expected response for item resolution. Clarify any necessary UI confirmation.

2.  **Already-Settled Constraints:**
    *   **Scope:** Limited to the "Pending Adam panel" within the Command Center UI.
    *   **Features:** Initial implementation focuses on displaying priority-sorted items and type badges.
    *   **Safety:** `[safe]` scope; no modifications to LifeOS user features or TSOS customer-facing surfaces.
    *   **Platform:** Node/ESM, adhering to existing project patterns.

3.  **Smallest Buildable Next Slice:**
    Implement the display of pending Adam panel items. This slice will fetch data (using mock data if API is not ready), sort items by a placeholder priority, and render them with placeholder type badges. The "one-click resolve" functionality is explicitly excluded from this slice.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `src/features/command-center/components/AdamPanel.js`: Main component for fetching and rendering the list.
    *   `src/features/command-center/components/AdamPanelItem.js`: Sub-component for individual item display (priority, type badge).
    *   `src/features/command-center/styles/AdamPanel.module.css`: Styling for the panel, items, and badges.
    *   `src/features/command-center/api/adamPanel.js`: (If not existing) API client for pending Adam panel data.
    *   `src/features/command-center/mocks/adamPanelData.js`: (Optional) Mock data for UI development.

5.  **Required Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   `AdamPanel.test.js`: Verify correct rendering of a list of items, sorted by priority.
        *   `AdamPanelItem.test.js`: Verify individual item renders with correct priority and type badge.
    *   **Integration Tests:**
        *   Verify `AdamPanel` correctly fetches and displays data from its API (or mock).
    *   **Linting/Formatting:** Standard checks.

6.  **Stop Conditions:**
    *   The Adam panel successfully renders a list of pending items.
    *   Items are visually sorted according to a defined (even if placeholder) priority.
    *   Each item displays a type badge (even if placeholder types).
    *   All new and modified unit/integration tests pass.
    *   No regressions in existing Command Center functionality.
    *   "One-click resolve" functionality is explicitly *not* implemented.