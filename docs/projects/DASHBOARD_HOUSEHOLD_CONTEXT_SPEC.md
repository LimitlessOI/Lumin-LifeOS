### Household/Context Switching UX at Shell Layer

This document specifies the user experience for switching between different household contexts within the LifeOS shell, focusing on visual affordances and data scoping. This specification does not include implementation details for authentication, authorization, or invitation flows.

#### 1. Badges

*   **Purpose:** To visually indicate the currently active household context at a glance.
*   **Location:** Positioned in the top-right corner of the shell, adjacent to the user's avatar or profile menu.
*   **Appearance:** A compact, pill-shaped badge displaying a short, recognizable identifier for the active household (e.g., the first letter, a custom icon, or a truncated name). On hover, the full household name should be displayed as a tooltip.
*   **Interaction:** Clicking the active household badge should trigger the Household Picker affordance.

#### 2. Picker Affordance

*   **Purpose:** To provide a clear mechanism for users to view all available households and switch between them.
*   **Location:** A dropdown menu or modal accessible from the shell's top navigation. This can be invoked by clicking the active household badge or a dedicated "Switch Household" icon.
*   **Appearance:**
    *   A scrollable list of all households the user is a member of.
    *   Each list item should display the household's full name and optionally a small, distinguishing icon or avatar.
    *   The currently active household must be clearly highlighted (e.g., with a checkmark, distinct background, or bold text).
    *   An option to "Create New Household" should be present, though its implementation is out of scope for this specification.
*   **Interaction:** Selecting a household from the list will initiate a context switch. The shell will update to reflect the data and configurations of the newly selected household.

#### 3. Tenant-Scoped vs. Shared Data/Settings

**Tenant-Scoped (Household-Specific)**
These elements are unique to each household and change when the user switches context.
*   **Dashboard Layouts & Widgets:** Customizations, data visualizations, and configured widgets specific to a household.
*   **Epistemic Facts & Memory:** Knowledge base entries, hypotheses, and memory items relevant to that household's domain.
*   **Scheduled Tasks:** Cron jobs, reminders, and automated workflows configured for a specific household.
*   **Domain-Specific Configurations:** Settings and preferences that apply only to the active household (e.g., specific integrations, data sources, agent rules).
*   **Activity Logs:** History of actions and events within that household's context.

**Shared (User-Specific, Cross-Household)**
These elements persist across household switches and are tied to the user's global profile.
*   **User Profile & Preferences:** Avatar, display name, language settings, global notification preferences.
*   **Global API Keys & Integrations:** API keys or integrations that are tied to the user's account rather than a specific household.
*   **Billing Information:** User-level billing details and subscription management.
*   **Application-Wide Settings:** Settings that affect the entire LifeOS platform experience for the user, regardless of the active household.
*   **Global Notifications:** Notifications that are not tied to a specific household activity but to the user's overall account.