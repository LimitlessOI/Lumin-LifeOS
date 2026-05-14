# Offline Queued Actions Specification

## 1. Introduction
This specification outlines a strategy for enabling user actions within the LifeOS Dashboard to be queued and processed when the user is offline, and subsequently synced with the server when network connectivity is restored. The primary goal is to enhance user experience by providing seamless interaction regardless of network status, ensuring data integrity and eventual consistency.

## 2. Goals
- **Seamless User Experience**: Allow users to perform key actions (e.g., adding MITs, marking tasks complete, sending chat messages) without immediate network access.
- **Data Persistence**: Ensure that user-initiated actions are durably stored locally until they can be successfully synced with the server.
- **Eventual Consistency**: Guarantee that all queued actions are eventually applied to the server-side data, with appropriate conflict resolution.
- **User Feedback**: Provide clear feedback to the user regarding the status of their offline actions, including successful syncs and detected conflicts.

## 3. Non-Goals
- Full Service Worker rollout for caching all application assets or network requests. The focus is specifically on queuing and syncing user-initiated data mutations.
- Real-time, bidirectional offline data synchronization beyond basic action queuing.
- Complex operational transformation (OT) or CRDT-based conflict resolution.

## 4. IndexedDB Storage Strategy
User actions will be stored in a dedicated IndexedDB database.

-   **Database Name**: `lifeos_offline_db`
-   **Object Store**: `queued_actions`
-   **Schema**:
    -   `id`: String (UUID or similar unique identifier, primary key)
    -   `type`: String (e.g., 'add_mit', 'toggle_mit', 'send_chat', 'update_goal')
    -   `payload`: JSON object (action-specific data required to re-execute the action)
    -   `timestamp`: ISO string (timestamp when the action was initiated by the user)
    -   `status`: String ('pending', 'syncing', 'failed', 'resolved', 'conflict')
    -   `attempts`: Integer (number of times a sync attempt has been made for this action)
    -   `last_error`: String (description of the last error encountered during sync, if any)
    -   `original_state`: JSON object (optional; snapshot of relevant data before modification, used for conflict detection/resolution)
    -   `target_endpoint`: String (the API endpoint this action targets, e.g., `/api/v1/lifeos/commitments`)
    -   `http_method`: String (e.g., 'POST', 'PUT', 'DELETE')

-   **Operations**:
    -   `add(action)`: Stores a new action with `status: 'pending'`.
    -   `get(id)`: Retrieves a specific action.
    -   `getAllPending()`: Retrieves all actions with `status: 'pending'` or `status: 'failed'` for retry.
    -   `update(id, updates)`: Modifies an action's properties (e.g., `status`, `attempts`, `last_error`).
    -   `delete(id)`: Removes an action from the store (typically after successful sync or user discard).

## 5. Background Sync Strategy
The Background Sync API will be utilized to automatically retry sending queued actions when network connectivity is restored.

-   **Service Worker (SW) Integration**: A minimal Service Worker will be registered to handle `sync` events.
-   **Sync Tag Registration**: When an action is queued while offline, a `sync` tag (e.g., `lifeos-sync-actions`) will be registered via `navigator.serviceWorker.ready.then(reg => reg.sync.register('lifeos-sync-actions'))`.
-   **SW `sync` Event Listener**:
    1.  Upon receiving the `sync` event for `lifeos-sync-actions`, the Service Worker will:
    2.  Fetch all actions from `queued_actions` with `status: 'pending'` or `status: 'failed'`.
    3.  For each action:
        -   Set `status: 'syncing'`.
        -   Attempt to send the action to its `target_endpoint` using its `http_method` and `payload`.
        -   **On Success (2xx response)**:
            -   Set `status: 'resolved'`.
            -   Delete the action from IndexedDB.
        -   **On Conflict (409 response or specific error payload)**:
            -   Set `status: 'conflict'`.
            -   Store server's conflicting state/message in `last_error`.
        -   **On Failure (other non-2xx response or network error)**:
            -   Increment `attempts`.
            -   Store error message in `last_error`.
            -   Set `status: 'failed'`.
            -   Implement exponential backoff for retries (handled by browser's sync manager).
-   **API Endpoint**: The existing API endpoints (e.g., `/api/v1/lifeos/commitments`, `/api/v1/lifeos/chat`) will be used. Server-side logic will need to handle idempotency and detect conflicts for these endpoints.

## 6. Conflict Resolution User Experience (UX)
When a queued action results in a conflict during synchronization, the user will be notified and provided options for resolution.

-   **Detection**: A conflict is detected when the server responds to a synced action with a specific conflict status (e.g., HTTP 409 Conflict) or a custom error payload indicating a data mismatch.
-   **Notification**:
    -   A persistent, non-intrusive UI element (e.g., a small badge on the dashboard header, or a dedicated "Offline Actions" section) will indicate the presence of pending conflicts.
    -   Clicking this element will navigate to a dedicated "Offline Actions" view.
-   **Conflict View**:
    -   This view will list all actions with `status: 'conflict'`.
    -   For each conflicting action, display:
        -   **Original Action**: A human-readable summary of the action the user attempted (e.g., "You marked 'Buy groceries' as done on [timestamp]").
        -   **Server State**: Information about the server's current state that caused the conflict (e.g., "Server indicates 'Buy groceries' was already deleted by another device").
        -   **Resolution Options**:
            -   **Discard Local**: The user accepts the server's state and discards their local action. The action is deleted from IndexedDB.
            -   **Apply Anyway**: The user chooses to re-attempt the action, potentially overriding the server's current state (requires server support for forced updates).
            -   **Edit & Retry**: For actions like goal updates, allow the user to modify the `payload` and re-queue the action.
            -   **Retry**: Simply re-attempt the original action (useful if the conflict was transient).
-   **Example Scenario**:
    -   User marks an MIT as `done` while offline.
    -   Another user/device deletes that MIT from the server.
    -   When the offline action syncs, the server returns a 404 or 409.
    -   Conflict UX: "You tried to mark 'Buy groceries' as done. Server says it no longer exists. Options: Discard, or Re-add as new MIT."

## 7. Deferred Actions
Actions that cannot be immediately processed or synced are considered deferred.

-   **Storage**: All deferred actions are stored in the `queued_actions` IndexedDB object store with `status: 'pending'` or `status: 'failed'`.
-   **Automatic Retries**: The Background Sync API inherently handles automatic retries for `pending` and `failed` actions when network conditions improve.
-   **User Visibility**: All deferred actions (pending, failed, or in conflict) will be accessible via the "Offline Actions" view, allowing users to monitor their status and manually intervene if necessary.
-   **Error Handling**: Clear error messages (`last_error`) will be stored and displayed to the user to explain why an action is deferred or failed.