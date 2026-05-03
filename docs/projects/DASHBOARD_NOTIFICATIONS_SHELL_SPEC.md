The task asks for a Markdown specification, but the output contract demands HTML implementation code.

# Dashboard Notification System Specification

This document outlines the specification for a dashboard-level notification, toast, and snackbar system within the LifeOS platform. The goal is to provide a consistent, accessible, and non-intrusive mechanism for communicating important information to the user. This specification focuses on the patterns and behaviors, not on specific implementation code.

## Surfaces

Notifications will primarily appear in a dedicated, fixed-position area on the dashboard.

-   **Primary Dashboard Toast Area**: A dedicated, fixed-position container, likely in the bottom-right of the viewport, for transient, non-modal alerts. These notifications should overlay existing content without causing layout shifts. This area will be managed by the Platform Core (Shell).
-   **AI Rail (Future Consideration)**: Notifications specific to AI interactions may eventually appear within the `lifeos-ai-rail-root`, but this is a separate pattern and out of scope for the initial dashboard-level implementation.
-   **In-Context Alerts**: For specific form validations or data updates, smaller, temporary messages may appear directly adjacent to the relevant UI element. This specification focuses on global toast/snackbar patterns.

## Stacking

Notifications will manage their display to prevent visual clutter and ensure readability.

-   **Fixed Position, Bottom-Up Stacking**: Notifications will appear at a fixed position (e.g., bottom-right of the viewport) and stack upwards. The newest notification will appear at the bottom of the stack, pushing older notifications upwards.
-   **Maximum Visible Notifications**: A configurable limit (e.g., 3-5) for simultaneously visible notifications. When the limit is reached, the oldest non-persistent notification will be automatically dismissed to make room for new ones.
-   **Visual Hierarchy**: Higher severity notifications should visually stand out (e.g., distinct background color, prominent icon, border accent) to immediately convey urgency.

## Persistence

Notification visibility and dismissal will be determined by their severity and user interaction.

-   **Severity-Based Auto-Dismissal**:
    -   **Info/Success**: Auto-dismiss after a short duration (e.g., 4-6 seconds).
    -   **Warning**: Auto-dismiss after a moderate duration (e.g., 8-10 seconds) or manual dismissal.
    -   **Error/Critical**: Requires explicit manual dismissal. These notifications should persist until the user interacts with them (e.g., clicks a dismiss button or takes an action).
-   **Manual Dismissal**: All notifications, regardless of severity, should include a clear, accessible dismiss button (e.g., an 'X' icon) allowing users to close them at any time.
-   **Do Not Disturb (DND) Hook**:
    -   A system-wide setting (e.g., accessible via a dashboard control or user preferences) will allow users to temporarily suppress non-critical (Info, Success, Warning) notifications.
    -   Critical Error notifications must always bypass DND to ensure important system issues are communicated.
    -   When DND is active, suppressed notifications should be queued and potentially summarized in a less intrusive manner (e.g., a small badge count) or logged for later review.

## Accessibility

The notification system must be designed to be accessible to all users, including those using assistive technologies.

-   **ARIA Live Regions**: Notifications must be implemented using ARIA live regions (e.g., `role="status"` for passive updates, `role="alert"` for urgent and important updates) to ensure screen readers announce them without interrupting the user's current focus.
-   **Keyboard Navigation**: Users must be able to navigate to and dismiss notifications using keyboard controls (e.g., Tab key to focus, Enter/Space to activate dismiss button).
-   **Sufficient Contrast**: Text and background colors must meet WCAG AA contrast guidelines to ensure readability for users with visual impairments.
-   **Clear and Concise Language**: Notification messages should be brief, easy to understand, and provide actionable information where appropriate. Avoid jargon.
-   **Focus Management**: Notifications should generally not steal focus from the user's current task. If a notification requires immediate user interaction, a separate modal dialog pattern should be considered.

## Deferred Implementation

This document serves as a high-level specification for the notification system.

-   **Shell Ownership**: The Platform Core (Shell) will own the core notification component, its styling, and the API for displaying notifications. This ensures consistency and centralized control.
-   **Domain Pushes**: Feature domains will push notification requests to the Shell's API, providing content, severity, and optional actions. This decouples feature logic from the UI presentation of notifications.
-   **No Production Code**: This specification explicitly avoids shipping production code. The actual implementation details (e.g., specific HTML structure, CSS classes, JavaScript API) will be developed based on these principles in a subsequent task.
-   **Future Work**: Integration with a centralized logging/telemetry system for notification delivery and user interaction tracking.