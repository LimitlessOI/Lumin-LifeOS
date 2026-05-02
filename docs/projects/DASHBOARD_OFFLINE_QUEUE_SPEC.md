# Offline Queued Actions Strategy

This document outlines a strategy for handling user actions when the device is offline, ensuring a responsive user experience and eventual synchronization with the server.

## 1. IndexedDB Storage and Queuing

User-initiated actions (e.g., adding an MIT, toggling an MIT, sending a chat message) will be immediately reflected in the UI and simultaneously stored in a local IndexedDB queue if the device is offline or the API call fails due to network issues.

### 1.1. Action Schema
Each queued action will be stored with the following structure:
- `id`: A unique client-generated identifier (e.g., UUID).
- `timestamp`: ISO string of when the action was initiated.
- `type`: String representing the action type (e.g., `addMIT`, `toggleMIT`, `sendChatMessage`).
- `endpoint`: The API endpoint the action targets (e.g., `/api/v1/lifeos/commitments`).
- `method`: HTTP method (e.g., `POST`, `PUT`).
- `payload`: JSON object containing the data required to re-execute the API call.
- `status`: Enum: `pending`, `syncing`, `success`, `failed`.
- `retries`: Integer, number of times the sync attempt has failed.
- `error`: Optional string, last error message if `status` is `failed`.

### 1.2. Immediate UI Feedback
Upon a user action, the UI will update optimistically as if the action succeeded. A visual indicator (e.g., a small cloud icon, a subtle spinner) will appear next to the affected UI element to signify that the action is pending synchronization.

## 2. Synchronization Strategy

Synchronization will be triggered by network status changes and periodically when online.

### 2.1. Network Status Detection
- The application will monitor `navigator.onLine` and listen for `online` and `offline` events.
- When the device transitions from `offline` to `online`, an immediate synchronization attempt will be initiated.

### 2.2. Sync Process
1.  **Retrieve Pending Actions**: When online, the system will query IndexedDB for all actions with `status: 'pending'`.
2.  **Execute Actions**: For each pending action:
    a.  Set `status: 'syncing'`.
    b.  Attempt to re-execute the original API call using the stored `endpoint`, `method`, and `payload`.
    c.  **On Success (2xx response)**:
        -   Update the UI to reflect successful sync (e.g., remove pending indicator).
        -   Mark the action `status: 'success'` in IndexedDB and remove it from the active queue (or move to an archive table).
    d.  **On Network Failure (e.g., `TypeError` for network, 0 status)**:
        -   Increment `retries`.
        -   Set `status: 'pending'` (to retry later).
        -   Implement an exponential backoff strategy for subsequent retries.
    e.  **On Server Error (4xx/5xx response)**:
        -   Increment `retries`.
        -   Set `status: 'failed'`.
        -   Store the server's error message in the `error` field.
        -   Trigger conflict resolution UX.

## 3. Conflict Resolution User Experience

Conflicts arise when a queued offline action cannot be successfully applied to the server state (e.g., due to data changes on the server while offline).

### 3.1. Conflict Detection
- Server API responses indicating specific conflict scenarios (e.g., HTTP 409 Conflict, or custom error codes) will be used to identify conflicts.
- For simpler cases, a 404 (Not Found) for an item that was expected to exist (e.g., toggling a deleted MIT) can also be treated as a conflict.

### 3.2. Conflict Resolution Strategy
- **User Notification**: When a conflict is detected, the UI will display a clear notification to the user, indicating which action failed and why.
- **Options for User**: For critical actions (e.g., MITs), the user will be presented with options:
    -   **Retry**: Attempt the action again (e.g., if the conflict was transient).
    -   **Discard**: Remove the action from the queue and revert any optimistic UI changes.
    -   **Edit**: Allow the user to modify the action's payload and retry.
- **Default Behavior (for non-critical/chat)**: For chat messages, a "Failed to send" indicator will appear, allowing the user to manually retry or delete the message.

### 3.3. UI Indicators
- **Pending**: A subtle icon (e.g., `☁️`) next to the item.
- **Syncing**: A spinner icon (e.g., `🔄`).
- **Failed/Conflict**: A warning icon (e.g., `⚠️`) with a tooltip providing details and resolution options.

## 4. Deferred Actions

The core of this strategy is to defer the actual API calls until network connectivity is stable. The user experience remains immediate and responsive, with the underlying system handling the eventual consistency. All actions stored in IndexedDB are inherently deferred until the sync process runs.

## 5. Non-Goals

-   **Full Service Worker Rollout**: This specification does not include a full Service Worker implementation for caching application assets, complex background sync, or push notifications. The focus is solely on queuing and synchronizing user-initiated data mutations.
-   **Complex Offline-First Caching**: While IndexedDB is used for action queuing, this does not extend to comprehensive offline caching of all application data for read operations.
---
{"target_file": "docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md", "insert_after_line": null, "confidence": 0.8}