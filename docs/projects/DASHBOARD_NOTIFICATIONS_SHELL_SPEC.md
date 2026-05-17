# LifeOS Dashboard Notification Specification

This document outlines the specification for dashboard-level notification, toast, and snackbar patterns within the LifeOS platform. The goal is to establish a consistent, accessible, and user-friendly system for communicating transient and persistent information to the user without disrupting their workflow.

## 1. Surfaces

Notifications will primarily appear in two forms:

### 1.1 Toast/Snackbar Notifications
-   **Placement**: Fixed position, typically bottom-right of the viewport on desktop, or bottom-center on mobile, ensuring it does not obscure critical dashboard content or the AI rail.
-   **Visibility**: Ephemeral, non-blocking. Designed for transient feedback, confirmations, or low-priority alerts.
-   **Styling**: Consistent with LifeOS design tokens for background, text, and border. Distinct visual cues for severity levels (info, success, warning, error).

### 1.2 Persistent Banner Notifications
-   **Placement**: Fixed position at the top of the main content area, below the header, spanning the full width of the `page` container.
-   **Visibility**: Persistent until explicitly dismissed by the user or resolved by the system. Designed for critical alerts, system status, or important announcements requiring user attention.
-   **Styling**: Distinct from toast notifications, potentially with a more prominent background and icon.

## 2. Stacking

### 2.1 Toast/Snackbar Stacking
-   **Behavior**: Multiple toast notifications will stack vertically. New notifications appear at the bottom of the stack, pushing older ones upwards.
-   **Limit**: A maximum of 3 toast notifications will be visible at any given time. If a new notification arrives when the stack is full, the oldest visible notification will be automatically dismissed to make room.
-   **Order**: Most recent notification is always visible at the bottom of the stack.

### 2.2 Persistent Banner Stacking
-   **Behavior**: Only one persistent banner notification will be displayed at a time. If multiple critical issues arise, the system will prioritize the most urgent or combine them into a single, actionable banner.
-   **Priority**: A new critical banner will replace an existing one if it is deemed higher priority.

## 3. Persistence

### 3.1 Toast/Snackbar Persistence
-   **Auto-Dismissal**:
    -   `info`, `success`: Automatically dismiss after 5 seconds.
    -   `warning`, `error`: Automatically dismiss after 8 seconds.
-   **User Dismissal**: All toast notifications will include a small, accessible close button (e.g., an "X" icon) allowing immediate dismissal.
-   **Session**: Toast notifications are transient and will not persist across page reloads or browser sessions.

### 3.2 Persistent Banner Persistence
-   **User Dismissal**: Banners must be explicitly dismissed by the user via a prominent close button.
-   **System Resolution**: Banners may also be automatically dismissed by the system once the underlying condition they represent has been resolved.
-   **Session**: Persistent banners will persist across page reloads and browser sessions until dismissed or resolved.

## 4. Accessibility

-   **ARIA Live Regions**: Toast and banner notifications will be implemented using ARIA live regions (`aria-live="polite"` for toasts, `aria-live="assertive"` for critical banners) to ensure screen readers announce their content without interrupting the user's current task.
-   **Keyboard Navigation**:
    -   Toast notifications: Focusable close buttons, dismissible via `Escape` key when focused.
    -   Banner notifications: Focusable close buttons, dismissible via `Escape` key when focused.
-   **Color Contrast**: All notification elements (text, background, icons) will meet WCAG 2.1 AA contrast standards.
-   **Reduced Motion**: Animations (e.g., fade-in/fade-out, stacking movement) will respect the `prefers-reduced-motion` media query.

## 5. Do Not Disturb (DND) Hook

-   **Integration**: A global `doNotDisturb` state will be maintained by the Platform Core.
-   **Behavior**:
    -   When DND is active, `info` and `success` toast notifications will be suppressed entirely.
    -   `warning` and `error` toast notifications will be displayed but without sound alerts, and their auto-dismissal time may be extended or require manual dismissal.
    -   Persistent banner notifications will always be displayed, regardless of DND status, due to their critical nature.
-   **User Control**: The DND state will be toggleable via a dashboard setting (e.g., a button in the header controls, similar to the theme toggle).

## 6. Shell Ownership vs. Domain Pushes

-   **Shell Ownership**: The LifeOS Platform Core (shell) will own the notification rendering and management system. This ensures consistency, centralized control over stacking, persistence, and DND integration.
-   **Domain Interface**: Individual domains will not directly render notifications. Instead, they will interact with a standardized `NotificationService` API exposed by the Platform Core.
-   **API Contract**: The `NotificationService` will provide methods such as `showToast(severity, message, options)` and `showBanner(severity, message, options)` where `options` can include `dismissible`, `duration`, `actionButton`, etc. This decouples notification content from presentation logic.
-   **Rationale**: This approach prevents UI fragmentation, ensures adherence to accessibility standards, and simplifies the implementation of cross-cutting concerns like DND.

## 7. Deferred Implementation

The following features are acknowledged but will be deferred to future iterations:
-   **Actionable Notifications**: Notifications containing interactive elements such as buttons for immediate actions (e.g., "Undo", "View Details").
-   **Notification Center**: A dedicated UI component or page to view a history of all notifications, including those that have been dismissed or auto-removed.
-   **Granular Domain Settings**: User-configurable settings to control notification preferences on a per-domain or per-type basis.
-   **Sound Alerts**: Audio cues for notifications, which will be integrated with DND settings.