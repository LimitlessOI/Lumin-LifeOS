<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Todo 4 G3. -->

BuilderOS Remediation: Amendment 12 Command Center - Pending Adam Panel Enhancement (Todo 4 G3)

This memo outlines the next buildable slice for enhancing the "Pending Adam panel" within the Command Center, focusing on displaying priority, type badges, and enabling one-click resolution.

1. Blocking Ambiguity or Founder Decision List
-   Priority Definition: What are the specific priority levels (e.g., P0, P1, P2, P3)? How are these priorities assigned and updated? Is there a default priority?
-   Type Badge Definition: What are the specific types (e.g., Bug, Feature, Chore, Debt, Alert)? Are these types fixed or configurable? What color/icon mapping should be used for each type?
-   One-Click Resolve Action: What specific state change does "resolve" trigger? Is there a confirmation dialog? What happens to the item after resolution (e.g., removed from panel, moved to 'resolved' view)?

2. Already-Settled Constraints
-   Execution is strictly within the BuilderOS-only governed loop.
-   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.
-   Implementation must adhere to the approved builder safe scope (`[safe]` blueprint tag).
-   The Adam panel data source must be extended to include priority and type fields.

3. The Smallest Buildable Next Slice
This slice focuses on the visual display of priority and type badges, and the priority-based sorting of items on the Pending Adam panel. The "one-click resolve" functionality is explicitly excluded from this slice due to pending founder decisions.

4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `src/components/AdamPanel/AdamPanel.jsx`: Update to fetch and render items with priority and type. Implement sorting logic.
-   `src/components/AdamPanel/AdamPanelItem.jsx`: Modify to display priority and type badges for each item.
-   `src/styles/components/AdamPanel.css`: Add styling for priority indicators and type badges.
-   `src/services/adamPanelService.js`: Extend data fetching to include `priority` and `type` fields from the backend.
-   `src/utils/adamPanelUtils.js`: Potentially add utility functions for priority sorting or type badge mapping.

5. Required Verifier/Runtime Checks
-   **UI Rendering Check:** Verify that priority levels (e.g., P0, P1) are visibly displayed on each Adam panel item.
-   **UI Rendering Check:** Verify that type badges (e.g., Bug, Feature) are visibly displayed on each Adam panel item.
-   **Sorting Check:** Verify that items on the Adam panel are correctly sorted according to their priority, with highest priority items appearing first.
-   **Data Integrity Check:** Ensure that the `priority` and `type` data fields are correctly retrieved and mapped from the backend.
-   **No Regression Check:** Confirm no existing Adam panel functionality is broken.
-   **Scope Adherence Check:** Verify no changes were made to LifeOS user features or TSOS customer-facing surfaces.

6. Stop Conditions
-   All Adam panel items correctly display their assigned priority.
-   All Adam panel items correctly display their assigned type badge.
-   The Adam panel items are consistently sorted by priority.
-   The "one-click resolve" feature remains unimplemented and untouched.
-   No new blocking ambiguities are identified for this specific slice.