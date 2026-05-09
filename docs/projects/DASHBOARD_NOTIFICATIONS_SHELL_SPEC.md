The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `public/shared/lifeos-bootstrap.js` files are missing from the repository, limiting grounding in their specific content.

---
Notification Specification for LifeOS Dashboard

This document outlines the design patterns for dashboard-level notifications, toasts, and snackbars within the LifeOS platform. The goal is to provide a consistent, user-friendly, and accessible notification experience without shipping production code at this stage.

### Surfaces

Notifications will appear as transient, non-blocking elements in the top-right corner of the LifeOS Dashboard.

-   **Placement**: Fixed position, `top: 20px`, `right: 20px` (adjusting for safe areas on mobile).
-   **Visuals**:
    -   Utilize existing dashboard theme variables (`--bg-overlay`, `--text-primary`, `--border`, `--radius-md`).
    -   Each notification will be a `card`-like element with rounded corners and a subtle shadow.
    -   **Severity Indicators**:
        -   **Info**: Default styling, potentially a subtle blue accent (e.g., `var(--c-today)`).
        -   **Success**: Green accent (e.g., `var(--c-health)`).
        -   **Warning**: Orange accent (e.g., `var(--c-decisions)`).
        -   **Error**: Red accent (e.g., `var(--c-conflict)`).
    -   **Content**: A concise message, optionally with an icon representing severity or source.
    -   **Dismissal**: An 'x' button for user-initiated dismissal.

### Stacking

Notifications will stack vertically, with newer notifications appearing above older ones.

-   **Order**: LIFO (Last-In, First-Out) visual order. New notifications push existing ones down.
-   **Maximum Visible**: A configurable maximum number of notifications visible at once (e.g., 3-5). If this limit is exceeded, the oldest non-critical notification will automatically dismiss or be hidden, or a "more notifications" indicator will appear.
-   **Animations**: Use `fadeUp` or a similar subtle animation for appearance, and a fade-out/slide-out animation for dismissal.

### Persistence

Notifications are primarily transient, but their dismissal behavior varies by criticality.

-   **Auto-Dismiss**: Non-critical notifications (Info, Success) will automatically dismiss after a predefined duration (e.g., 5-8 seconds).
-   **Manual Dismissal**: Warning and Error notifications will require explicit user dismissal via an 'x' button.
-   **Hover Behavior**: Hovering over a notification will pause its auto-dismiss timer.
-   **No History**: At this stage, there is no persistent "Notification Center" or history log. Once dismissed (manually or automatically), a notification is gone from the UI.

### Accessibility

The notification system must adhere to accessibility best practices.

-   **ARIA Live Regions**: Notifications will be implemented using ARIA live regions (`aria-live="polite"` for most, `aria-live="assertive"` for critical errors) to ensure screen readers announce new content.
-   **Keyboard Navigation**: Dismissal buttons must be keyboard-focusable and operable (e.g., via Enter/Space key).
-   **Color Contrast**: Ensure sufficient color contrast for text and icons against their backgrounds, especially for severity indicators.
-   **Reduced Motion**: Respect `prefers-reduced-motion` system settings by disabling or simplifying animations.

### Do Not Disturb Hook

A mechanism to suppress non-critical notifications will be integrated.

-   **Control**: A toggle in the dashboard header controls the "Do Not Disturb" (DND) state. This could be part of the existing `hdr-controls` or a new dedicated button.
-   **Behavior**: When DND is active, only critical notifications (e.g., `severity: 'error'`) will be displayed. Info, Success, and Warning notifications will be suppressed.
-   **Visual Indicator**: A clear visual indicator (e.g., an icon change on the DND toggle, or a small banner) will show when DND is active.

### Shell Ownership vs. Domain Pushes

The dashboard shell is responsible for the UI rendering and lifecycle management of notifications, while other domains are responsible for generating and pushing notification data.

-   **Shell Ownership**: The `public/overlay/lifeos-dashboard.html` and its associated client-side JavaScript will own the presentation layer, including CSS styling, DOM manipulation, stacking logic, and dismissal handling.
-   **Domain Pushes**: Other LifeOS domains will push notification data to a dedicated API endpoint (e.g., `POST /api/v1/lifeos/notifications`).
-   **Notification Data Structure**:
    ```json
    {
      "id": "unique-notification-id",
      "message": "A concise message for the user.",
      "severity": "info" | "success" | "warning" | "error",
      "dismissible": true, // true for manual dismissal, false for auto-dismiss (if duration is set)
      "duration": 5000,    // Optional: milliseconds for auto-dismiss. Overrides dismissible=false if present.
      "action": {          // Optional: a primary action button within the notification
        "label": "View Details",
        "url": "/dashboard/details/123"
      }
    }
    ```
-   **Delivery Mechanism**: The dashboard will poll the `/api/v1/lifeos/notifications` endpoint or subscribe via WebSockets (future consideration) to receive new notifications.

### Deferred Implementation

This specification serves as a blueprint. No production code for the notification system will be implemented or shipped as part of this task. Future tasks will cover:

1.  Development of the client-side JavaScript module for notification management.
2.  Creation of the necessary CSS for styling notifications.
3.  Implementation of the `POST /api/v1/lifeos/notifications` API endpoint.
4.  Integration of DND settings into user preferences.