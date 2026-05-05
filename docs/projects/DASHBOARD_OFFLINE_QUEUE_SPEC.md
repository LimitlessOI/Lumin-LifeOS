# LIFEOS Dashboard Builder Brief: Offline Queued Actions

## Problem Statement

The LIFEOS Dashboard Builder currently requires a persistent network connection for all actions (e.g., creating tasks, modifying rules, committing builds). Intermittent network connectivity or complete offline scenarios lead to data loss, frustrated users, and a degraded experience. To enhance resilience and user productivity, the builder needs to support queuing actions locally and synchronizing them with the server when connectivity is restored.

## Goals

*   Enable users to perform builder actions (e.g., create/edit tasks, update configurations) while offline or with unstable network connections.
*   Store pending actions locally using IndexedDB.
*   Automatically synchronize queued actions with the server when network connectivity is detected.
*   Provide clear user feedback on the status of queued actions (pending, syncing, successful, failed, conflicted).
*   Minimize data loss due to network interruptions.

## Non-Goals

*   Full Service Worker rollout for caching assets or an offline-first application shell. This brief focuses solely on queuing and synchronizing user-initiated data mutations.
*   Complex real-time collaboration features with multi-user conflict resolution beyond basic last-write-wins or user-prompted choices.
*   Offline access to read-only data beyond what is already cached by the browser.

## Proposed Solution Outline

### 1. Core Mechanism: IndexedDB Action Queue

All builder actions that modify server state will first be written to an IndexedDB store on the client. Each queued action will include:

*   `id`: Unique identifier (UUID).
*   `timestamp`: When the action was initiated.
*   `type`: Type of action (e.g., `CREATE_TASK`, `UPDATE_RULE`, `COMMIT_BUILD`).
*   `payload`: The data required to perform the action on the server.
*   `status`: `PENDING`, `SYNCING`, `SUCCESS`, `FAILED`, `CONFLICT`.
*   `retries`: Number of retry attempts.
*   `error`: Last error message, if any.
*   `targetUrl`: The API endpoint for the action.
*   `method`: HTTP method (POST, PUT, DELETE).

### 2. Synchronization Strategy

*   **Network Detection**: Monitor network connectivity changes (e.g., `navigator.onLine` event listener).
*   **Queue Processing**: When online, a background process will iterate through `PENDING` actions in IndexedDB.
*   **Sequential Execution**: Actions will be sent to the server sequentially to maintain order of operations.
*   **Retry Logic**: Implement exponential backoff for failed synchronization attempts.
*   **Background Sync API (Deferred Consideration)**: While not a full Service Worker rollout, the Background Sync API could be explored for more robust background synchronization without requiring the user to keep the tab open. For initial implementation, a simpler client-side polling/event-driven approach is sufficient.

### 3. Conflict Resolution

*   **Server-Side Detection**: The server API should return specific error codes (e.g., 409 Conflict) when a queued action attempts to modify stale data.
*   **Client-Side Handling**:
    *   **Last-Write-Wins (Default)**: For non-critical updates, the client can attempt to re-apply the action with the latest server state, or simply overwrite.
    *   **User Prompt (Critical Actions)**: For actions like `COMMIT_BUILD` or significant rule changes, if a conflict is detected, the action's status will be set to `CONFLICT`, and the user will be prompted to:
        *   Review the conflict (show local vs. server state).
        *   Choose to overwrite server, discard local, or manually merge (if applicable).
        *   Re-queue the action after resolution.

### 4. User Experience (UX)

*   **Offline Indicator**: A prominent UI element (e.g., a banner or icon) indicating "Offline Mode - Actions are being queued."
*   **Pending Actions List**: A dedicated section or modal where users can view all `PENDING`, `SYNCING`, `FAILED`, and `CONFLICT` actions.
*   **Action Status Feedback**:
    *   Visual cues (e.g., spinner, checkmark, error icon) next to UI elements that triggered a queued action.
    *   Toast notifications for successful synchronization or critical failures.
*   **Manual Retry/Discard**: Users should have the option to manually retry failed actions or discard pending/conflicted actions from the queue.

### 5. Error Handling and Retries

*   **Network Errors**: Distinguish between network errors (retryable) and server-side application errors (potentially not retryable without modification).
*   **Max Retries**: After a configurable number of retries, a `FAILED` status will be set, requiring user intervention.
*   **Idempotency**: Server endpoints should be designed to be idempotent where possible to prevent duplicate processing of retried actions.

## Technical Considerations

*   **Browser Compatibility**: Ensure IndexedDB and network detection APIs are widely supported across target browsers.
*   **Storage Limits**: Monitor IndexedDB usage to stay within browser-imposed limits.
*   **Security**: Ensure no sensitive data is stored unencrypted in IndexedDB if not already handled by browser security.
*   **Performance**: Efficient IndexedDB operations and background synchronization to avoid UI jank.

## Future Considerations (Deferred)

*   Integration with a full Service Worker for comprehensive offline capabilities (asset caching, push notifications).
*   More sophisticated conflict resolution strategies (e.g., operational transformation for collaborative editing).
*   Server-side support for optimistic locking or versioning to aid conflict detection.