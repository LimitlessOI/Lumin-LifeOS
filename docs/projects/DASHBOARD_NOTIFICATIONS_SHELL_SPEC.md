### Dashboard Notification System Specification

#### 1. Surfaces
The LifeOS Dashboard will implement a unified notification system to deliver timely, contextual feedback to the user. Notifications will primarily render within the `public/overlay/lifeos-dashboard.html` shell.

**Types of Notifications:**
-   **Toast/Snackbar:** Ephemeral, non-blocking messages for success, informational updates, or minor warnings. These will typically appear in a fixed, non-intrusive corner of the viewport (e.g., top-right or bottom-center). They may include a single, optional action button.
-   **Persistent Banner:** Designed for critical errors, important system status updates, or actions requiring immediate user attention. These will appear at the top of the main content area, pushing existing content downwards. Persistent banners require explicit user dismissal.

**Ownership & Pushing:**
-   **Shell Ownership:** The `Platform Core` (specifically the dashboard shell) is the authoritative owner of the notification UI rendering, positioning logic, stacking management, and global state. This ensures a consistent user experience across the platform.
-   **Domain Pushes:** Feature domains will push notification *data* (e.g., message content, severity level, optional action details, display duration) to a dedicated API endpoint or a shared client-side service provided by Platform Core. The shell will then consume and render these notifications according to this specification, decoupling content from presentation.

#### 2. Stacking
To effectively manage multiple concurrent notifications, a clear stacking mechanism will be implemented.

-   **Toast/Snackbar Stacking:** Notifications of this type will stack vertically within their designated viewport corner. Newest notifications will appear at the top of the stack, pushing older ones downwards.
-   **Visibility Limit:** A maximum of 3-5 toast/snackbar notifications will be visible simultaneously. If more notifications are pushed, older ephemeral notifications will be automatically dismissed, while others may be moved to a hidden queue or a future "notification center" for later review.
-   **Persistent Banners:** Only one persistent banner can be active and displayed at the top of the content area at any given time. If a new critical banner is pushed while another is active, the new banner will either replace the existing one or be queued for display upon the dismissal of the current banner, based on a defined severity hierarchy.

#### 3. Persistence
Notification persistence will be determined by its type and severity.

-   **Dismissal:**
    -   **Toast/Snackbar:** These will auto-dismiss after a predefined duration (e.g., 5-7 seconds for informational/success messages, 10-15 seconds for warnings). All toast/snackbar notifications will also include an explicit "X" or "Dismiss" button for manual user dismissal.
    -   **Persistent Banner:** These require explicit user dismissal via a prominent "X" or an action button. They will not auto-dismiss.
-   **Logging:** All notifications, regardless of their type or dismissal method, will be logged to an internal audit trail. This log will capture the timestamp, message content, severity, and dismissal method for diagnostic and historical purposes.

#### 4. Accessibility
The notification system will adhere to Web Content Accessibility Guidelines (WCAG) to ensure usability for all users.

-   **ARIA Roles:** Notifications will utilize appropriate ARIA live region roles (`role="alert"` for critical, `role="status"` for less urgent) to ensure screen readers announce changes without interrupting the user's current task flow.
-   **Keyboard Navigation:** All dismissible notifications will be keyboard-accessible. Users must be able to navigate to and dismiss notifications using standard keyboard interactions (e.g., Tab key to focus the close button, Enter/Space to activate). The Escape key should dismiss the topmost toast/snackbar if it is currently focused.
-   **Visual Design:** High contrast ratios for text and background colors will be enforced to meet WCAG contrast requirements. Clear visual indicators for severity (e.g., distinct color coding, universally recognized icons) will be employed.
-   **Motion:** Animations (e.g., fade-in/out, slide-in) will be subtle and non-distracting. A user preference to reduce motion will be respected, disabling or simplifying these animations when active.

#### 5. Do Not Disturb Hook
The notification system will integrate with a global "Do Not Disturb" (DND) setting to manage user interruptions effectively.

-   **DND State:** The dashboard shell will expose a clear DND state (e.g., `isDNDActive: boolean`) that the notification system can query.
-   **Suppression:** When DND is active, all non-critical toast/snackbar notifications will be suppressed from immediate visual display. These suppressed notifications may be silently logged or queued for display once DND is deactivated, or summarized in a less intrusive manner (e.g., a small badge icon on a notification center).
-   **Critical Bypass:** Critical system alerts (e.g., security breaches, data corruption warnings, urgent system health notifications) will be designed to bypass DND to ensure essential information reaches the user. This bypass mechanism will be used sparingly and with clear, documented justification.
-   **User Preferences:** Users will have granular control over DND settings, including the ability to schedule DND periods and define which specific types of notifications (if any) are permitted to bypass the DND state.

#### 6. Deferred Implementation
This document serves as a high-level specification for the LifeOS Dashboard notification system. No production code for this feature is to be implemented or shipped as part of the current task. Implementation details, including specific API endpoints for pushing notifications, client-side rendering components, detailed styling, and comprehensive testing strategies, will be addressed in subsequent development tasks following the approval of this specification.