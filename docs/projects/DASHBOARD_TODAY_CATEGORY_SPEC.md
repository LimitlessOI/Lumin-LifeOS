No existing dashboard sections (id/class) were visible in injected HTML, so references are not possible.

# Today Category Specification

This document outlines the layout blocks and API assumptions for the "Today" category within the LifeOS dashboard. These blocks are designed to integrate with the existing dashboard density specification (`DASHBOARD_WIDGET_DENSITY_SPEC.md`) to provide a configurable visual experience.

## 1. Layout Blocks

The "Today" category will comprise the following distinct dashboard cards, each designed to be a self-contained widget adhering to the `data-density` attribute for visual presentation.

### 1.1. Most Important Tasks (MITs) Card
*   **Purpose:** Display the user's top priority tasks for the current day.
*   **Content:** A scrollable list of MITs. Each item will include:
    *   A checkbox for completion status.
    *   Task title.
    *   Optional due time or contextual tag.
*   **Interactions:**
    *   Toggle completion status.
    *   Quick-add new MIT via an inline input or dedicated button.
    *   (Future) Reorder MITs.
*   **Density Impact:**
    *   `compact`: Maximizes visible MITs, smaller text, reduced padding.
    *   `balanced`: Standard display, comfortable spacing.
    *   `expanded`: Fewer MITs visible, larger text, increased padding.

### 1.2. Schedule/Calendar Card
*   **Purpose:** Present a concise overview of upcoming events and appointments for the day.
*   **Content:** A chronological list of events. Each item will include:
    *   Event time (e.g., "9:00 AM").
    *   Event title.
    *   Optional location or brief description.
*   **Interactions:**
    *   View event details (opens modal/sidebar).
    *   Quick-add new event via a dedicated button.
*   **Density Impact:**
    *   `compact`: More events visible, tighter spacing.
    *   `balanced`: Standard event display.
    *   `expanded`: Fewer events, larger time/title display.

### 1.3. Alerts/Notifications Card
*   **Purpose:** Display recent and unread system alerts or important notifications relevant to the user's day.
*   **Content:** A list of active alerts. Each item will include:
    *   Alert message.
    *   Timestamp (e.g., "10 min ago").
    *   Severity indicator (e.g., icon for info, warning, error).
*   **Interactions:**
    *   Dismiss/mark as read.
    *   View full notification details.
*   **Density Impact:**
    *   `compact`: More alerts visible, minimal padding.
    *   `balanced`: Standard alert display.
    *   `expanded`: Fewer alerts, more prominent messages.

### 1.4. Quick Add Card
*   **Purpose:** Provide a streamlined interface for rapidly adding new tasks, events, or Lumin entries without navigating away from the "Today" view.
*   **Content:**
    *   A primary text input field.
    *   A selector (e.g., dropdown, segmented control) to choose the item type (Task, Event, Lumin).
    *   A submit button.
    *   (Optional) Contextual fields that appear based on selected type (e.g., due date for task, time for event).
*   **Interactions:**
    *   Input text and select type to create new item.
*   **Density Impact:**
    *   `compact`: Smaller input fields, minimal button padding.
    *   `balanced`: Standard input and button sizes.
    *   `expanded`: Larger input fields, more prominent buttons.

### 1.5. Lumin Entry Card
*   **Purpose:** Facilitate daily reflection or journaling directly from the dashboard.
*   **Content:**
    *   A multi-line text area for the Lumin entry.
    *   Timestamp of the last