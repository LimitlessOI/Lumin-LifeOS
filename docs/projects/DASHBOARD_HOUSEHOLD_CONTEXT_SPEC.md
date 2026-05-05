# LIFEOS Dashboard Builder Brief: Household/Context Switching UX

This document outlines the user experience for household and context switching at the shell layer of the LifeOS dashboard, focusing on visual affordances and data scoping without delving into authentication or invitation mechanisms.

## 1. Context Switching Affordance (Picker)

A prominent, easily accessible picker will be located in the global header, likely near the user avatar or system status indicators.

### 1.1. Visual Design
- **Primary Display:** The current active household/context name will be displayed, e.g., "My Household", "Work Project Alpha", "Guest Mode".
- **Clickable Element:** The displayed name will be a clickable element, potentially accompanied by a small dropdown arrow icon (e.g., `▼` or `⌄`) to indicate interactivity.
- **Dropdown Menu:** Clicking the element will reveal a dropdown menu listing all available households/contexts the user can switch to.
    - Each item in the list will display the household/context name.
    - The currently active household/context will be visually distinguished (e.g., bolded, highlighted, or with a checkmark icon).
    - A "Create New Context" or "Manage Contexts" option may be present, leading to a separate configuration area (out of scope for this brief).

### 1.2. Interaction
- **Selection:** Clicking an item in the dropdown will immediately switch the user's active context.
- **Feedback:** A brief visual confirmation (e.g., a toast notification "Switched to 'Work Project Alpha'") or a quick reload of relevant dashboard components will indicate the successful switch.

## 2. Badges and Indicators

Visual badges will provide quick context at a glance, especially for shared or special contexts.

### 2.1. Context-Specific Badges
- **Shared Context Indicator:** For contexts that are explicitly shared with other users (e.g., a family household, a team project), a small icon or badge (e.g., a "👥" icon or "Shared" text badge) could appear next to the context name in the picker dropdown and potentially in the primary display when active.
- **Special Mode Badges:** If specific contexts imply different operational modes (e.g., "Guest Mode", "Read-Only Archive"), a distinct badge could be displayed.

### 2.2. Global Header Badges
- **Active Context Name:** As described above, the active context name itself acts as a primary badge.
- **Notifications:** Global notifications (e.g., system alerts, new messages) will remain visible regardless of the active context, but context-specific notifications will only appear when that context is active.

## 3. Tenant-Scoped vs. Shared Data/UI Elements

The system will clearly delineate what information and UI elements are specific to the active context (tenant-scoped) and what remains consistent across all contexts (shared).

### 3.1. Tenant-Scoped Elements (Switch with Context)
These elements change entirely or display data relevant only to the currently active household/context.
- **Dashboard Widgets/Panels:** All data displayed within the main dashboard area (e.g., task lists, calendar events, sensor readings, financial summaries) will be specific to the active context.
- **Navigation Menus (Contextual):** While the primary navigation structure might remain consistent, the content or available options within certain navigation sections (e.g., "Tasks", "Notes", "Devices") will filter to show only items relevant to the active context.
- **Settings (Context-Specific):** Settings related to the specific household/context (e.g., context-specific preferences, member lists for that context, specific integrations) will change upon switching.

### 3.2. Shared Elements (Persist Across Contexts)
These elements remain consistent regardless of the active household/context.
- **Global Header/Footer:** The primary navigation bar, user avatar, global search, and system-wide notifications will persist.
- **User Profile Settings:** Personal user preferences, account security settings, and billing information (if applicable) are tied to the individual user, not a specific context.
- **System-Wide Tools:** Tools or utilities that operate independently of specific household data (e.g., a global help system, feedback mechanisms, developer tools) will remain accessible.
- **"All Contexts" View (Future Consideration):** A potential future feature could be a special "All Contexts" view that aggregates certain types of data across all contexts the user has access to, but this would be a distinct mode, not the default behavior of context switching.