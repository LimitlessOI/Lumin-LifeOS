# BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5 (Project Card Tooltip)

This memo outlines the next buildable slice for implementing the project card tooltip feature as described in `AMENDMENT_12_COMMAND_CENTER.md`.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Data Source & Type for 'focus'**: What is the exact data source for "focus" (e.g., `Project` model, `UserProject` preferences, derived metric)? What is its expected data type (e.g., string, number, boolean, timestamp)?
*   **Data Source & Type for 'last worked'**: What is the exact data source for "last worked" (e.g., activity log, `Project` model timestamp)? What is its expected data type (e.g., timestamp, duration string)?
*   **Tooltip Content & Formatting**: What is the precise text, labels (e.g., "Focus:", "Last Worked:"), and formatting required for the 'focus' and 'last worked' data within the tooltip?
*   **Project Card Component Identification**: Confirm the exact file path and component name for the "project card" to be modified.

### 2. Already-Settled Constraints

*   **Target**: Implement a tooltip on hover for an existing "project card" UI component within BuilderOS.
*   **Content**: The tooltip must display information