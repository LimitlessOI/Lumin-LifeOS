# LifeOS Dashboard Notification System Specification

This document outlines the specification for a dashboard-level notification, toast, and snackbar system within the LifeOS platform. The goal is to provide a consistent, accessible, and manageable mechanism for communicating timely information to the user without disrupting their workflow.

## 1. Surfaces

Notifications will appear as transient, non-modal UI elements, typically positioned in a fixed area of the dashboard.

-   **Primary Surface:** A dedicated container, fixed to the top-right or bottom-center of the viewport, will host all dashboard-level notifications. This ensures visibility across different dashboard layouts and prevents overlap with core content.
-   **Types:**
    -   **Toast/Snackbar:** Short, non-critical messages that appear briefly and auto-dismiss. Ideal for confirmations or minor informational updates.
    -   **Notification:** More persistent messages that may require user attention or action. Can include a title, message, and optional action buttons.
    -   **Critical Alert (Future Consideration):** Highly persistent, potentially blocking messages for severe system issues, requiring explicit user acknowledgment. (Deferred for initial implementation).

## 2. Stacking

When multiple notifications are active, they will stack in a predictable manner.

-   **Order:** New notifications will appear at the top of the stack (if positioned top-right) or bottom of the stack (if positioned bottom-center), pushing older notifications away from the edge of the screen.
-   **Maximum Visible:** A configurable maximum number of notifications (e.g., 3-5) will be visible at any given time. Older notifications beyond this limit will be queued or automatically dismissed based on their severity and persistence settings.
-   **Animation:** Notifications will animate into and out of view smoothly to avoid jarring transitions.

## 3. Persistence

Notifications will have defined lifecycles and dismissal mechanisms.

-   **Auto-Dismissal:**
    -   **Toast/Snackbar:** Automatically dismiss after a short, configurable duration (e.g., 5-8 seconds).
    -   **Notification:** May auto-dismiss after a longer duration (e.g., 15-20 seconds) if not interacted with, or persist until manually dismissed, depending on severity.
-   **Manual Dismissal:** All non-critical notifications will include a clear dismissal button (e.g., "X" icon) allowing the user to close them immediately.
-   **"Do Not Disturb" Hook:** The system will integrate with a user-configurable "Do Not Disturb" setting. When active, only notifications marked as `critical` or `high-priority` will be displayed. Other notifications will be suppressed or queued for later display. This setting will be managed via `localStorage` or user preferences API.

## 4. Accessibility

The notification system will adhere to WCAG guidelines to ensure usability for all users.

-   **ARIA Roles:** Notifications will utilize appropriate ARIA roles (e.g., `role="status"` for passive updates, `role="alert"` for urgent, time-sensitive information) and `aria-live` attributes (`polite` or `assertive`) to ensure screen readers announce content effectively.
-   **Keyboard Navigation:** Users will be able to dismiss notifications using keyboard controls (e.g., `Escape` key, `Tab` to focus and `Enter`/`Space` to activate a dismiss button).
-   **Contrast:** Text and background colors will meet minimum contrast ratios.
-   **Motion:** Animations will respect the `prefers-reduced-motion` media query.

## 5. Shell Ownership vs. Domain Pushes

The dashboard "shell" (`public/overlay/lifeos-dashboard.html` and its associated scripts) will own the notification rendering and lifecycle management. Individual domains will push notification requests to the shell.

-   **Shell Responsibility:**
    -   Rendering the notification UI.
    -   Managing the notification queue and stacking logic.
    -   Handling auto-dismissal and manual dismissal events.
    -   Implementing the "Do Not Disturb" logic.
    -   Providing a public API for domains to interact with.
-   **Domain Responsibility:**
    -   Triggering notifications via a standardized API provided by the dashboard shell (e.g., `LifeOS.notify({ message: '...', severity: 'info', duration: 5000, action: { label: 'View', callback: () => {} } })`).
    -   Specifying notification content, severity (e.g., `info`, `success`, `warning`, `error`), and optional actions.
    -   Domains will *not* directly manipulate the DOM for notifications.

## 6. Deferred Implementation

This document serves as a specification. The actual implementation of the notification system (HTML structure, CSS styling, and JavaScript logic) is a subsequent task. No production code for this feature is included in this specification.