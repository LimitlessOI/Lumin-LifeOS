# LifeOS Dashboard Notification System Specification

This document outlines the specification for a dashboard-level notification, toast, and snackbar system within the LifeOS platform. The system will be owned by Platform Core (the dashboard shell) and will provide a standardized interface for other domains to push notifications. This specification focuses on design and behavior, not implementation code.

## 1. Surfaces

Notifications will appear in designated areas of the dashboard, ensuring they are visible but do not obstruct critical content or user interaction.

### 1.1 Toast/Snackbar Notifications
-   **Location**: Bottom-right corner of the viewport on desktop, or bottom-center on mobile.
-   **Purpose**: Ephemeral, non-critical feedback (e.g., "MIT added successfully", "Settings saved").
-   **Appearance**: Small, rectangular, with an optional icon and brief text.
-   **Interaction**: Can be dismissed manually or auto-dismiss after a short duration.
-   **Severity Visuals**:
    -   **Info**: Subtle background (e.g., `var(--bg-surface2)`), `var(--text-secondary)` text.
    -   **Success**: Green accent (e.g., `var(--c-health)`), white text.
    -   **Warning**: Orange accent (e.g., `var(--c-decisions)`), dark text.
    -   **Error**: Red accent (e.g., `var(--c-conflict)`), white text.

### 1.2 Persistent Banner Notifications
-   **Location**: Top of the main content area, below the header, spanning the full width of the `page` container.
-   **Purpose**: Important, actionable, or system-wide alerts that require user attention (e.g., "API key missing", "New update available").
-   **Appearance**: More prominent than toasts, with a clear background color indicating severity, an icon, and more detailed text. May include action buttons.
-   **Interaction**: Must be manually dismissed by the user via a close button.
-   **Severity Visuals**:
    -   **Info**: Light blue background, dark text.
    -   **Warning**: Yellow/orange background, dark text.
    -   **Error**: Red background, white text.

## 2. Stacking

The system must handle multiple concurrent notifications gracefully.

### 2.1 Toast/Snackbar Stacking
-   **Behavior**: New toasts will appear above existing ones, pushing older toasts upwards.
-   **Limit**: A maximum of 3-5 toasts will be visible at any given time. Older toasts will fade out or be removed from the stack if the limit is exceeded.
-   **Order**: Most recent notification is always at the top of the stack.

### 2.2 Persistent Banner Stacking
-   **Behavior**: Only one persistent banner notification will be displayed at a time. If a new banner is triggered while one is active, the new banner will replace the old one, or be queued if the existing one is critical and non-dismissible until an action is taken.
-   **Priority**: A priority system will determine which banner takes precedence if multiple are active. Critical errors override warnings, which override info.

## 3. Persistence

Notifications will have defined lifecycles and dismissal mechanisms.

### 3.1 Auto-Dismissal
-   **Duration**: Toasts will auto-dismiss after a configurable duration (e.g., 3-5 seconds for info/success, 7-10 seconds for warnings).
-   **Hover/Focus**: Auto-dismissal timers will pause when the user hovers over or focuses on a toast.

### 3.2 Manual Dismissal
-   **Mechanism**: All notifications (toasts and banners) will include a clear "X" or "Dismiss" button for manual dismissal.
-   **State**: Dismissed notifications will not reappear unless triggered again by a new event.

### 3.3 Persistent Notifications
-   **Requirement**: Certain critical system alerts (e.g., "API key invalid") may be non-dismissible until the underlying issue is resolved or a specific action is taken. These will typically be banner notifications.

### 3.4 Do Not Disturb (DND) Hook
-   **Mechanism**: A user setting (e.g., accessible via the header controls or a dedicated settings page) will allow users to enable a "Do Not Disturb" mode.
-   **Behavior**:
    -   In DND mode, low-severity (info, success) toasts will be suppressed or appear in a less intrusive manner (e.g., a subtle icon badge on a dedicated notification center, if implemented).
    -   Warning and error notifications will still appear but may be visually de-emphasized or queued for later review, depending on criticality.
    -   Critical system alerts will always bypass DND.
-   **Integration**: The DND state will be accessible by the notification system to modify display behavior.

## 4. Accessibility

The notification system will adhere to WCAG guidelines to ensure usability for all users.

-   **ARIA Roles**: Notifications will utilize appropriate ARIA roles (e.g., `role="alert"` for critical, `role="status"` for less urgent) to convey their purpose to screen readers. Live regions will be used to announce dynamic content changes.
-   **Keyboard Navigation**: Users must be able to navigate to and dismiss notifications using keyboard controls (e.g., Tab to focus, Enter/Space to dismiss).
-   **Color Contrast**: All text and background colors will meet minimum WCAG contrast ratios.
-   **Motion**: Animations (e.g., fade-in/out, slide-up) will be subtle and respect `prefers-reduced-motion` user settings.
-   **Focus Management**: When a critical banner appears, focus may be programmatically moved to it, or a live region update will be used to announce its presence without stealing focus, depending on the level of interruption desired.

## 5. Deferred Implementation

This document serves as a specification. The actual implementation of the notification system will be undertaken in a future task. The dashboard shell (Platform Core) will own the UI components and logic for rendering and managing notifications. Other domains will interact with this system via a simple API (e.g., `LifeOS.notify({ type: 'success', message: 'MIT added' })`) provided by the shell, pushing notification data to it. The shell will be responsible for all rendering, stacking, dismissal, and DND logic.