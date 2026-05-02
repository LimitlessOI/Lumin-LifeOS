# LifeOS Dashboard Notification System Specification

This document outlines the specification for a dashboard-level notification (toast/snackbar) system within the LifeOS platform. The goal is to define patterns for displaying transient, actionable messages to the user, ensuring consistency, accessibility, and clear ownership between the dashboard shell and individual domains. This specification does not include production code; it defines the requirements and architectural approach.

## 1. Surfaces

Notifications will appear as transient "toast" or "snackbar" messages.

-   **Primary Surface:** Top-right corner of the main dashboard viewport, fixed position. This area avoids conflict with the chat interface and AI rail.
-   **Placement:** Notifications will appear from the top-right and stack downwards.
-   **Visibility:** Notifications should be visible above all other dashboard content, with an appropriate `z-index`.

## 2. Stacking

The system must gracefully handle multiple concurrent notifications.

-   **Vertical Stacking:** New notifications will appear at the top of the notification area, pushing older notifications downwards.
-   **Maximum Count:** A configurable maximum number of visible notifications (e.g., 3-5) will be enforced. If the limit is reached, the oldest non-persistent notification will be automatically dismissed to make room for new ones.
-   **Order:** Notifications are displayed in reverse chronological order (newest on top).

## 3. Persistence and Dismissal

Notifications will have varying persistence behaviors based on their severity and user interaction.

-   **Severity Levels:**
    -   **Info:** General information, non-critical. Auto-dismiss after a short duration (e.g., 5 seconds).
    -   **Success:** Confirmation of a successful action. Auto-dismiss after a short duration (e.g., 5 seconds).
    -   **Warning:** Important but non-blocking issues. Auto-dismiss after a moderate duration (e.g., 8-10 seconds) or manual dismissal.
    -   **Error:** Critical issues requiring user attention. Manual dismissal required.
    -   **Actionable:** Notifications with embedded actions (e.g., "Undo", "View Details"). Manual dismissal required, or dismissal upon action completion.
-   **Manual Dismissal:** All notifications, regardless of severity, must include a clear, clickable dismiss button (e.g., an "X" icon).
-   **Hover Pause:** Auto-dismissal timers should pause when the user hovers over a notification.
-   **"Do Not Disturb" Hook:**
    -   A global setting, accessible via the header controls or a dedicated dashboard setting, will allow users to temporarily suppress non-critical (Info, Success) notifications.
    -   Critical (Warning, Error, Actionable) notifications will bypass "Do Not Disturb" mode.
    -   The "Do Not Disturb" state should be persisted in `localStorage`.

## 4. Accessibility

The notification system must be accessible to all users.

-   **ARIA Roles:** Notifications will utilize appropriate ARIA roles, such as `role="status"` for non-critical updates and `role="alert"` for critical, time-sensitive information, to ensure screen readers announce them.
-   **Live Regions:** Notifications will be placed within an `aria-live` region to ensure dynamic content changes are announced.
-   **Keyboard Navigation:** Users must be able to navigate to and dismiss notifications using keyboard controls (e.g., Tab to focus, Enter/Space to dismiss).
-   **Contrast:** Text and background colors will adhere to WCAG 2.1 AA contrast guidelines.
-   **Focus Management:** When a critical notification appears, focus should not be automatically shifted, but the notification should be announced.

## 5. Shell Ownership vs. Domain Pushes

The dashboard shell (`public/overlay/lifeos-dashboard.html` and associated scripts) will own the notification UI and core logic.

-   **Shell Responsibility:**
    -   Rendering of notification components (styling, positioning, stacking).
    -   Managing auto-dismissal timers.
    -   Handling "Do Not Disturb" logic.
    -   Providing a public API for domains to push notifications.
    -   Ensuring accessibility standards are met.
-   **Domain Responsibility:**
    -   Domains will push notifications via a standardized API provided by the shell.
    -   Domains will specify the notification content (text, optional actions), severity, and any domain-specific metadata.
    -   Domains will *not* directly manipulate the DOM to display notifications.

## 6. Deferred Implementation

This document serves as a specification. Implementation of the notification system will be a subsequent task, adhering to the patterns and requirements outlined herein. No production notification code is to be shipped as part of this specification.