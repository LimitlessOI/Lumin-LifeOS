The task requests a Markdown specification, but the output contract specifies a complete HTML document and implementation code.

# LifeOS Dashboard Notifications Specification

This document outlines the specification for dashboard-level notification, toast, and snackbar patterns within the LifeOS Dashboard. The goal is to establish a consistent, accessible, and extensible system for communicating transient and persistent information to the user, distinguishing between the dashboard shell's responsibility for UI management and feature domains' responsibility for triggering notifications.

## 1. Surfaces

Notifications will appear in a dedicated, fixed position within the dashboard UI.

-   **Primary Surface:** A "toast" or "snackbar" area, fixed to the `top-right` corner of the viewport, with a slight offset from the edge (e.g., `right: 24px; top: 24px;`). This area will be responsible for displaying transient, time-sensitive messages.
-   **Secondary Surface (Future Consideration):** A dedicated "Notification Center" accessible via a header icon (e.g., a bell icon) for persistent, historical, or less urgent notifications that require user review. This is out of scope for the initial implementation but should be considered in the design.

## 2. Stacking

When multiple notifications are triggered, they will stack in the primary surface.

-   **Order:** Newest notifications will appear at the top of the stack, pushing older notifications downwards (LIFO - Last In, First Out).
-   **Limit:** A maximum of `3` notifications will be visible at any given time. If more notifications are triggered, they will queue and appear as older ones are dismissed or expire.
-   **Visuals:** Notifications will have a consistent visual style, with distinct indicators for severity (e.g., color-coded borders or icons).

## 3. Persistence and Dismissal

Notifications will have defined lifecycles and dismissal mechanisms.

-   **Severity Levels:**
    -   `Info`: General information, low urgency.
    -   `Success`: Confirmation of a successful action.
    -   `Warning`: Non-critical issues, potential problems.
    -   `Error`: Critical issues, failed actions.
    -   `Critical`: System-level failures, immediate attention required.
-   **Auto-Dismissal:**
    -   `Info` and `Success` severity notifications will automatically dismiss after `5` seconds.
    -   `Warning` severity notifications will automatically dismiss after `8` seconds.
    -   `Error` and `Critical` severity notifications will *not* auto-dismiss and will require explicit user action.
-   **Manual Dismissal:** All notifications, regardless of severity, will include a visible "X" (close) button or similar affordance for manual dismissal.
-   **User Interaction:** Hovering over a notification will pause its auto-dismissal timer. Clicking or interacting with a notification (if it contains an action) will also pause or dismiss it.
-   **Session Persistence:** Notifications are transient and will not persist across page reloads or browser sessions.

## 4. Accessibility

The notification system will adhere to WCAG guidelines to ensure accessibility for all users.

-   **ARIA Live Regions:** The notification container will be an `aria-live` region.
    -   `aria-live="polite"` will be used for `Info`, `Success`, and `Warning` notifications to announce them without interrupting ongoing tasks.
    -   `aria-live="assertive"` will be used for `Error` and `Critical` notifications to ensure immediate announcement due to their urgency.
-   **Keyboard Navigation:**
    -   Notifications will be focusable via keyboard (e.g., Tab key).
    -   The close button within each notification will be focusable and activatable via `Enter` or `Space` keys.
-   **Color Contrast:** All text and interactive elements within notifications will meet WCAG AA contrast ratios against their background.
-   **Semantic HTML:** Use appropriate HTML elements (e.g., `role="alert"`, `role="status"`) to convey meaning to assistive technologies.

## 5. Shell Ownership vs. Domain Pushes

A clear separation of concerns will be maintained between the dashboard shell and feature domains.

-   **Shell Ownership (Platform Core):**
    -   The dashboard shell (Platform Core) will own the *rendering*, *positioning*, *stacking logic*, *dismissal mechanisms*, and *accessibility features* of the notification UI.
    -   It will provide a central API or event bus for domains to push notifications.
    -   It will manage the "Do Not Disturb" state and apply it to incoming notifications.
-   **Domain Pushes (Feature Domains):**
    -   Feature domains will be responsible for *triggering* notifications by providing structured data (message, severity, optional action, unique ID) to the shell's notification API.
    -   Domains will *not* directly manipulate the notification DOM or manage their lifecycle.

## 6. Do Not Disturb (DND) Hook

A "Do Not Disturb" mode will allow users to temporarily suppress non-critical notifications.

-   **Toggle:** A dedicated toggle button will be added to the dashboard header (similar to the existing "Ambient voice" button) to activate/deactivate DND mode.
-   **Behavior:**
    -   When DND is active, `Info`, `Success`, and `Warning` notifications will be suppressed (not displayed).
    -   `Error` and `Critical` notifications will *always* be displayed, regardless of DND status, due to their importance.
    -   Suppressed notifications will *not* be queued or displayed later; they are simply discarded.
-   **Persistence:** The DND state will be persisted in `localStorage` to maintain user preference across sessions.
-   **Visual Feedback:** The DND toggle button will visually indicate its active state (e.g., a different icon or color).

## 7. Deferred Implementation

This document serves as a specification. No production notification code is to be shipped as part of this task. The implementation will involve:

-   Creating a new JavaScript module (e.g., `public/shared/lifeos-notifications.js`) to manage the notification logic and DOM manipulation.
-   Integrating this module into `public/overlay/lifeos-dashboard.html` and potentially `public/shared/lifeos-bootstrap.js` (if it were available and suitable for shared utilities).
-   Defining a clear API for other dashboard modules to trigger notifications.
-   Adding necessary CSS to `public/shared/lifeos-dashboard-tokens.css` or `public/overlay/lifeos-dashboard.html`'s style block for notification styling.