## Dashboard Notification Patterns Specification

This document outlines the design specification for dashboard-level notification patterns, including toasts and snackbars, within the LifeOS platform. The goal is to establish a consistent, user-friendly, and accessible notification system that is owned by the platform shell but can be utilized by various domains.

### Surfaces

Notifications will appear as transient, non-blocking elements, typically positioned in the top-right or bottom-right corner of the dashboard viewport. They should be visually distinct but integrate with the existing LifeOS design language.

#### Visual Characteristics:
- **Container**: Utilize `var(--bg-overlay)` for background, `var(--border-focus)` for border, and `var(--radius-md)` for corner radius, consistent with existing UI elements like tooltips.
- **Text**: `var(--text-primary)` for main content, `var(--text-secondary)` for secondary details.
- **Severity Levels**:
    - **Info**: Accent with `var(--c-today)` (blue/purple gradient).
    - **Success**: Accent with `var(--c-health)` (green).
    - **Warning**: Accent with `var(--c-decisions)` (orange).
    - **Error/Critical**: Accent with `var(--c-conflict)` (red).
    - Visual accent can be a left-border, icon, or text color.
- **Dismissal**:
    - **Manual**: A clear "X" or "Dismiss" button, styled as a subtle `hdr-btn` variant, allowing users to close the notification immediately.
    - **Automatic**: Notifications will auto-dismiss after a predefined duration (e.g., 5-8 seconds for info/success, longer for warnings/errors). Hovering over a notification should pause the auto-dismiss timer.

#### Shell Ownership vs. Domain Pushes:
The dashboard shell (`public/overlay/lifeos-dashboard.html`) will own the rendering and management of the notification display area. Individual domains will push notification data (type, message, severity, optional action) to a client-side API exposed by the shell. This ensures consistent UI/UX and centralized control over notification behavior.

### Stacking

When multiple notifications are active, they will stack vertically.
- **Direction**: New notifications will appear at the top of the stack, pushing older notifications downwards.
- **Limit**: A maximum of 3-5 notifications should be visible at any given time to prevent screen clutter. Older notifications beyond this limit will be queued or automatically dismissed based on severity and age.
- **Spacing**: Consistent vertical spacing (e.g., 12-16px) between stacked notifications.

### Persistence

- **Transient Nature**: Notifications are primarily transient. Once dismissed (manually or automatically), they are removed from the active display.
- **No Session Persistence**: Standard toast/snackbar notifications will not persist across browser sessions or page reloads. More critical, persistent messages would require a separate "inbox" or "alert center" mechanism, which is out of scope for this specification.
- **Do Not Disturb (DND) Hook**:
    - If a "Do Not Disturb" mode is active (via a user setting or system state), new notifications will be suppressed from immediate display.
    - Suppressed notifications should be queued and made available for review once DND mode is deactivated, or summarized in a single, less intrusive indicator.
    - Critical error notifications may bypass DND mode, but this should be an exception and clearly justified.

### Accessibility

The notification system must adhere to WCAG guidelines.
- **ARIA Roles**: Notifications should use appropriate ARIA roles (e.g., `role="status"` for non-critical, `role="alert"` for critical) to ensure screen readers announce them.
- **Keyboard Navigation**: Users must be able to navigate to and dismiss notifications using keyboard controls (e.g., Tab to focus, Enter/Space to dismiss).
- **Contrast**: Text and background colors will meet minimum contrast ratios.
- **Motion**: Animations (e.g., fade-in/fade-out, slide-in) should be subtle and respect `prefers-reduced-motion` media queries.
- **Focus Management**: Focus should not be stolen from the main content when a notification appears, unless it's a critical, actionable alert.

### Deferred Implementation

This document serves as a specification for the notification patterns. Implementation details, including specific JavaScript APIs for domains to push notifications and the underlying DOM structure, will be developed in a subsequent task. No production notification code is to be shipped as part of this specification.