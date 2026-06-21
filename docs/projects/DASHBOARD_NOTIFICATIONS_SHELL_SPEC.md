<!-- SYNOPSIS: Dashboard Notification Patterns Specification -->

# Dashboard Notification Patterns Specification

This document outlines the desired patterns for dashboard-level notifications, toasts, and snackbars within the LifeOS platform. The goal is to provide a consistent, accessible, and non-intrusive mechanism for communicating important information to the user.

## 1. Surfaces

Notifications will appear as ephemeral or persistent overlays on the dashboard.

### 1.1. Placement
Notifications will primarily appear in a fixed position, typically the top-right or bottom-center of the viewport, ensuring they do not obstruct primary content or interactive elements.

### 1.2. Types
*   **Toast:** A small, non-blocking, ephemeral message that appears briefly and then fades away. Ideal for confirmations or minor informational updates.
*   **Snackbar:** A slightly larger, ephemeral message that may contain a single action button. Appears briefly, then fades. Suitable for actions that can be undone or require a quick follow-up.
*   **Persistent Notification:** A message that remains visible until explicitly dismissed by the user. Reserved for critical information, errors, or tasks requiring immediate attention.

### 1.3. Severity
Notifications will visually differentiate based on severity:
*   **Info:** General information (e.g., "Settings saved").
*   **Success:** Positive feedback (e.g., "Task completed").
*   **Warning:** Non-critical issues or potential problems (e.g., "Low battery").
*   **Error:** Critical issues or failures (e.g., "Failed to sync data").
*   **Accent:** Domain-specific accent color for specific contexts (e.g., `var(--c-today)` for MITs).

## 2. Stacking

When multiple notifications are active, they must stack gracefully without overlapping.

### 2.1. Order
Newest notifications will appear at the top of the stack (if positioned at the top of the screen) or bottom of the stack (if positioned at the bottom of the screen).

### 2.2. Limit
A maximum number of visible notifications will be enforced (e.g., 3-5). If more notifications are pending, a mechanism (e.g., a "show all" button or a counter) will indicate their presence without cluttering the UI.

### 2.3. Animation
Notifications will animate into and out of view smoothly (e.g., fade and slide) to avoid jarring transitions.

## 3. Persistence

The duration and visibility of notifications will vary based on their type and importance.

### 3.1. Auto-Dismissal
Toasts and Snackbars will automatically dismiss after a configurable timeout (e.g., 3-7 seconds). The timeout may be paused on hover or focus.

### 3.2. User Dismissal
All non-critical notifications should be dismissible by the user via a clear close button (e.g., an "X" icon). Persistent notifications *must* be explicitly dismissed.

### 3.3. Session-Based
Dismissed ephemeral notifications will not reappear within the same user session.

### 3.4. Cross-Session
Critical system-level notifications (e.g., API key invalid, major service outage) may persist across sessions until the underlying issue is resolved or explicitly acknowledged by the user.

## 4. Accessibility

Notifications must be accessible to all users, including those using assistive technologies.

### 4.1. ARIA Roles
Appropriate ARIA live regions (`aria-live="polite"` for non-critical, `aria-live="assertive"` for critical) and `role="status"` or `role="alert"` will be used to announce notifications to screen readers.

### 4.2. Keyboard Navigation
Users must be able to dismiss actionable or persistent notifications using keyboard controls (e.g., Tab to focus a close button, Enter/Space to activate). The Escape key should dismiss the most recently focused or active notification if applicable.

### 4.3. Color Contrast
All text and interactive elements within notifications will meet WCAG 2.1 AA contrast standards.

### 4.4. Reduced Motion
The system will respect user preferences for reduced motion (e.g., `prefers-reduced-motion` media query) by providing simpler, less animated transitions.

### 4.5. Focus Management
Notifications should generally not steal focus unless they are critical and require immediate user interaction.

## 5. Deferred Implementation

This specification serves as a blueprint. The actual implementation will involve:
*   A dedicated front-end component (e.g., a custom element or framework component) for rendering individual notifications.
*   A centralized notification manager module within the dashboard shell (`public/overlay/lifeos-dashboard.html` context) responsible for queuing, stacking, and displaying notifications.
*   A clear API for other dashboard widgets and backend services to "push" notification data to the manager.
*   Integration with a "Do Not Disturb" (DND) or "Focus Mode" setting.

### 5.1. Shell Ownership vs. Domain Pushes
The dashboard shell (`public/overlay/lifeos-dashboard.html`) will own the UI/UX and rendering logic for all notifications. Individual domains (e.g., MITs, Calendar, Chat, backend services) will push notification payloads (message, type, actions, etc.) to the shell's notification manager. The shell will then handle the display according to these patterns.

### 5.2. Do Not Disturb Hook
A global user setting will allow suppression of non-critical notifications. Critical system alerts (e.g., API errors) will bypass this setting. When DND is active, a subtle visual indicator may be present on the dashboard.