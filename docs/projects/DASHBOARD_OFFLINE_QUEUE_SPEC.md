The primary brief file `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is missing, leading to an incomplete specification. This outline is based on the task title and common patterns for offline queuing.

---
## Specification: LifeOS Dashboard Offline Queued Actions

### 1. Goal

Enable the LifeOS Dashboard to queue user-initiated API actions when offline, providing a seamless user experience and synchronizing these actions with the server once connectivity is restored.

### 2. Core Technologies

*   **IndexedDB:** For persistent client-side storage of queued actions.
*   **`navigator.onLine`:** For real-time online/offline detection.
*   **`window.addEventListener('online')` / `('offline')`:** For reacting to connectivity changes.
*   **(Optional, non-goal unless brief requires):** Background Sync API via Service Worker for more robust background synchronization.

### 3. Key Use Cases for Offline Queuing

The following user actions, which currently trigger API calls, should be queued:

*   **MITs:** Adding new MITs (`addMIT`), toggling MIT completion status (`toggleMIT`).
*   **Chat:** Sending messages to Lumin (`sendChat`).

Other dashboard features (e.g., theme toggle, ambient mode toggle, voice settings) primarily manage local state or trigger non-critical API calls and are not primary targets for offline queuing, though their state should persist locally.

### 4. Strategy Outline

#### 4.1. Offline Detection & API Interception

1.  **`API` Function Modification:** The existing `API` helper function will be enhanced to:
    *   Check `navigator.onLine` before attempting a `fetch` request for `POST`, `PUT`, or `DELETE` methods.
    *   If `navigator.onLine` is `false`, intercept the request.
    *   Store the request details in IndexedDB (see 4.2).
    *   Immediately resolve the `Promise` to allow the UI to update as if the action succeeded, providing optimistic feedback.
    *   If `navigator.onLine` is `true`, proceed with the original `fetch` request.

#### 4.2. Queuing Mechanism (IndexedDB)

1.  **Database Setup:**
    *   Create an IndexedDB database named `lifeos_offline_queue`.
    *   Create an object store named `actions` with `id` as the key path and `autoIncrement` set to `true` (or use UUIDs for `id`).
    *   Create an index on `timestamp` for ordered retrieval.
2.  **Queued Action Data Structure:** Each queued action will be an object stored in IndexedDB:
    ```javascript
    {
        id: <unique_id>, // e.g., UUID or auto-incremented
        timestamp: <ISO_string>, // When the action was initiated
        url: <string>,           // Full API endpoint URL
        method: <string>,        // HTTP method (POST, PUT, DELETE)
        body: <object>,          // Request body payload
        status: 'pending',       // 'pending', 'retrying', 'failed', 'completed'
        retries: 0,              // Number of retry attempts
        error: null              // Last error message if failed
    }
    ```
3.  **Storing Actions:** When offline, the intercepted `API` call will construct and store this object in the `actions` store.

#### 4.3. Synchronization Strategy

1.  **Online Event Listener:** Attach an event listener to `window` for the `online` event.
2.  **Synchronization Function:** When the `online` event fires, or on dashboard load if online, trigger a `syncOfflineActions()` function.
3.  **Processing Queue:**
    *   `syncOfflineActions()` will retrieve all `pending` or `retrying` actions from IndexedDB, ordered by `timestamp`.
    *   It will iterate through these actions, attempting to `fetch` each one using its stored `url`, `method`, and `body`.
    *   **Success:** If an action successfully completes:
        *   Remove it from IndexedDB.
        *   Trigger a UI refresh for the relevant section (e.g., `loadMITs()`, `initChat()`) to ensure server state is reflected.
    *   **Failure:** If an action fails (e.g., network error, server error):
        *   Increment `retries`.
        *   Update its `status` to `retrying` or `failed` in IndexedDB.
        *   Implement an exponential backoff strategy for retries if `status` is `retrying`.
        *   Notify the user about the failure.

#### 4.4. Conflict Resolution & User Experience (UX)

1.  **Optimistic UI Updates:** For actions like adding MITs, the UI should update immediately (e.g., show the new MIT in the list). This provides a responsive feel even when offline.
2.  **Server-Side Wins (Default):** In case of a conflict during synchronization (e.g., an MIT was deleted on the server while a local toggle was queued), the server's state is generally considered authoritative.
3.  **User Notification:**
    *   **Offline Indicator:** Display a subtle visual indicator (e.g., a small icon or banner) when the dashboard is offline and actions are being queued.
    *   **Pending Actions Indicator:** A small badge or icon could indicate the number of pending offline actions.
    *   **Sync Status:** Provide feedback on successful synchronization (e.g., "All actions synced!") or failures (e.g., "Some actions failed to sync. Tap here to review.").
    *   **Conflict Feedback:** If a specific action fails due to a conflict (e.g., "MIT 'X' could not be updated, it no longer exists on the server."), provide specific feedback.
4.  **Manual Retry/Clear:** Offer a mechanism (e.g., a button in a settings panel or a dedicated "Offline Actions" view) for users to manually retry failed actions or clear the queue.

#### 4.5. Deferred Actions

*   The IndexedDB queuing and synchronization mechanism inherently handles deferred actions. Actions are stored and processed only when connectivity allows, ensuring no data loss and eventual consistency.

### 5. Non-Goals

*   Full Service Worker rollout for caching or advanced background tasks, unless specifically required by a subsequent brief. The focus is on the queuing logic within the main application script.
*   Complex, real-time conflict resolution strategies requiring user intervention for every conflict. A "server-side wins" approach is preferred for simplicity initially.