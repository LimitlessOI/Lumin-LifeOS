# Offline Queued Actions Strategy

## 1. Overview
This document outlines a strategy for enabling offline queuing and synchronization of user actions within the LifeOS Dashboard. The primary goal is to improve user experience by allowing actions to be performed even when network connectivity is intermittent or unavailable, with subsequent synchronization when online.

## 2. Core Components

### 2.1. IndexedDB for Action Queue
All user-initiated API requests (e.g., adding/toggling MITs, sending chat messages, updating goals) will be intercepted and, if the application is offline or the request fails due to network issues, stored in a dedicated IndexedDB object store.

**Schema for `offline-actions` store:**
- `id`: Unique identifier (e.g., UUID) for the action.
- `timestamp`: When the action was initiated.
- `url`: The API endpoint URL.
- `method`: HTTP method (POST, PUT, DELETE).
- `headers`: Request headers (e.g., `x-lifeos-key`, `Content-Type`).
- `body`: Request body (JSON string).
- `retries`: Number of retry attempts.
- `lastAttempt`: Timestamp of the last retry.
- `status`: `pending`, `failed`, `completed`.
- `error`: Last error message, if any.

### 2.2. Request Interception and Queuing
A wrapper around the existing `fetch` API (or the `API` helper function) will be implemented to:
1.  Check network status (`navigator.onLine`).
2.  If online, attempt the request. If it fails with a network error, queue it.
3.  If offline, immediately queue the request.
4.  Update the UI optimistically (e.g., mark an MIT as done, add a chat message locally) before the server confirms.

### 2.3. Synchronization Mechanism

#### Option A: Client-Side Polling/Event Listener (No Service Worker)
Given the non-goal of a full Service Worker rollout, the initial implementation will rely on client-side logic:
-   **Connectivity Detection**: Listen to `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`.
-   **Sync Process**: When the `online` event fires, or periodically while online, a background process will:
    1.  Retrieve pending actions from IndexedDB.
    2.  Attempt to re-send them in order.
    3.  On success, remove the action from IndexedDB.
    4.  On network failure, update `retries` and `lastAttempt`.
    5.  Implement exponential backoff for retries to avoid overwhelming the server.

#### Option B: Background Sync API (Requires Service Worker - Future Consideration)
If a Service Worker is introduced in the future, the Background Sync API would be the preferred mechanism for more robust and persistent background synchronization. This would allow retries even when the user has closed the tab.

## 3. Conflict Resolution User Experience (UX)

### 3.1. Optimistic UI with Reversion
-   User actions will immediately reflect in the UI (optimistic update).
-   If a queued action fails on synchronization due to a server-side conflict (e.g., 409 HTTP status code, or specific error messages indicating data inconsistency), the UI state related to that action will revert or be flagged.

### 3.2. User Notification and Manual Resolution
-   A subtle, persistent indicator (e.g., a small icon in the header or a toast notification) will inform the user that there are pending or failed offline actions.
-   Clicking this indicator will open a modal or a dedicated section showing the list of conflicted actions.
-   For simple conflicts (e.g., an MIT was already completed by another device), the system might suggest an automatic resolution (e.g., discard local change).
-   For complex conflicts (e.g., two different updates to the same goal), the user will be presented with options:
    -   **Keep Local**: Overwrite server state with the local, queued action.
    -   **Discard Local**: Accept the server's current state and discard the queued action.
    -   **Review Details**: Show a diff or more context to help the user decide.

### 3.3. Read-Only State for Conflicted Items
In cases of severe or unresolvable conflicts, the affected UI component (e.g., a specific MIT item) might temporarily enter a read-only or disabled state until the user explicitly resolves the conflict.

## 4. Deferred Actions and Retry Logic

### 4.1. Automatic Retries with Exponential Backoff
-   Queued actions will be retried automatically.
-   The retry interval will increase exponentially (e.g., 1s, 5s, 25s, 125s) to prevent rapid, repeated failures and conserve battery/network.
-   A maximum number of retries will be defined (e.g., 5-10 attempts). After this, the action will be marked as `failed`.

### 4.2. User Interface for Deferred Status
-   A global indicator (e.g., a small badge or icon) will show the count of pending/failed offline actions.
-   Clicking this indicator will allow the user to view the queue, manually retry specific failed actions, or discard them.
-   Individual UI elements (e.g., an MIT checkbox) might show a "pending sync" state (e.g., a spinning icon or a slightly dimmed appearance) until the action is successfully synchronized.

## 5. Explicit Non-Goals
-   **Full Service Worker Rollout**: This specification does not include a full Service Worker implementation for caching assets or advanced offline capabilities beyond action queuing. While Background Sync is mentioned as a future enhancement, the initial focus is on client-side IndexedDB and event-driven synchronization.
-   **Complex Offline Data Models**: This strategy focuses on queuing API requests for user actions, not on providing a fully functional offline-first experience with complex data synchronization and reconciliation for all data reads.
-   **Real-time Conflict Resolution**: The conflict resolution strategy is primarily user-driven upon detection, not an automated real-time merge system.