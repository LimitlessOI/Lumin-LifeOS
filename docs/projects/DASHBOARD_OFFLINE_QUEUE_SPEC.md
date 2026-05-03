## Queued Actions Offline Strategy

This document outlines a strategy for enabling offline queuing of user actions within the LifeOS Dashboard, leveraging browser-side storage and synchronization mechanisms.

### 1. IndexedDB / Background Sync Strategy

**Goal:** Ensure user actions (e.g., adding an MIT, toggling a task, sending a chat message) are persisted locally during network outages and automatically synchronized with the server when connectivity is restored.

**Components:**

*   **IndexedDB:** Used as the primary persistent storage for queued actions.
    *   **Database Name:** `lifeos_offline_queue`
    *   **Object Store:** `actions`
    *   **Schema for `actions` store:**
        *   `id`: (string, primary key) A unique UUID generated client-side for each action.
        *   `timestamp`: (number) `Date.now()` when the action was initiated.
        *   `actionType`: (string) e.g., `'add_mit'`, `'toggle_mit'`, `'send_chat_message'`, `'update_goal'`.
        *   `endpoint`: (string) The API endpoint the action targets (e.g., `/api/v1/lifeos/commitments`).
        *   `method`: (string) HTTP method (e.g., `'POST'`, `'PUT'`).
        *   `payload`: (object) The JSON body of the API request.
        *   `status`: (string) `'pending'`, `'retrying'`, `'succeeded'`, `'failed'`.
        *   `retries`: (number) Count of synchronization attempts.
        *   `error`: (string, optional) Last error message if sync failed.
*   **Background Sync API (`navigator.serviceWorker.ready.then(reg => reg.sync.register('lifeos-sync'))`):**
    *   When an action is queued, attempt to send it immediately. If the network is offline or the request fails, store the action in IndexedDB and register a `background-sync` tag.
    *   The Service Worker will listen for the `sync` event for the registered tag. When connectivity is restored, the Service Worker will wake up and attempt to process all `pending` actions from IndexedDB.
    *   Actions will be processed in order of `timestamp`.
*   **Fallback for Background Sync (if not supported or Service Worker not active):**
    *   Implement a simple polling mechanism (e.g., `setInterval` every 30-60 seconds) to check for network status and attempt to process `pending` actions from IndexedDB. This would be less efficient but provides basic resilience.

**Workflow:**

1.  **User Action:** User performs an action (e.g., clicks "Add" for an MIT).
2.  **Attempt API Call:** The frontend attempts to make the corresponding API call.
3.  **Network Check / Failure:**
    *   If the API call succeeds, the action is complete.
    *   If the API call fails (e.g., network error, 5xx status), or `navigator.onLine` is false:
        *   Generate a unique `id` for the action.
        *   Store the action details (type, endpoint, method, payload, timestamp, status='pending') in IndexedDB.
        *   Register a `background-sync` event (if Service Worker is active).
        *   Update the UI to reflect the pending state (see Deferred Actions).
4.  **Service Worker Sync (or Polling Fallback):**
    *   When the `sync` event fires (or during a poll), the Service Worker fetches `pending` actions from IndexedDB.
    *   For each action:
        *   Attempt the API call using the stored `endpoint`, `method`, and `payload`.
        *   If successful: Mark action as `succeeded` in IndexedDB, remove from queue, and notify UI (if active).
        *   If failed (e.g., server error, conflict): Increment `retries`, update `error` message, and potentially mark as `failed` after a max retry count.
5.  **UI Update:** The dashboard UI reflects the status of actions (pending, succeeded, failed).

### 2. Conflict Resolution User Experience (UX)

**Goal:** Provide a clear and minimal UX for handling potential data conflicts when offline changes are synchronized.

**Strategy:** Prioritize simplicity and user flow over complex merge UIs for initial implementation.

*   **Last-Write-Wins (Default):** For most simple updates (e.g., toggling an MIT, updating a score), the server's state or the most recent successful sync will overwrite older local changes. This avoids complex merge logic.
*   **Append-Only (Chat, MITs):** For actions like adding chat messages or new MITs, these are inherently additive. Conflicts are less likely, and new items should simply be appended to the existing server data.
*   **Notification for Overwrites/Failures:**
    *   If a local change is overwritten by a server update during sync (e.g., an MIT toggled offline is found to be deleted on the server), a subtle, non-blocking notification (e.g., a small toast or icon) will appear on the dashboard indicating "Some offline changes could not be applied."
    *   Clicking this notification could reveal a list of failed actions with options to "Retry" or "Discard."
*   **Visual Cues:**
    *   **Pending:** Actions initiated offline will have a visual indicator (e.g., a small clock icon, a slightly desaturated appearance) to show they are pending synchronization.
    *   **Failed:** If an action fails after multiple retries, it will display a clear error state (e.g., a red exclamation mark) and potentially a "Retry" button next to the item.
*   **User Control:** Provide a dedicated section (e.g., in a settings panel or a hidden debug console) to view the offline queue, manually trigger a sync, or clear failed actions.

### 3. Deferred Actions (UI Feedback)

**Goal:** Provide immediate visual feedback to the user that their action has been accepted locally, even if it hasn't yet reached the server.

**Implementation:**

*   **Immediate UI Update:** When a user performs an action, update the UI immediately as if the action succeeded. For example, if an MIT is toggled, visually mark it as complete. If a chat message is sent, display it in the chat feed.
*   **Pending State Indicator:**
    *   For individual items (e.g., MITs, chat messages): Add a subtle visual cue (e.g., a small spinner, a lighter text color, a "sending..." label) next to the item to indicate it's pending synchronization.
    *   For the overall dashboard: A small, persistent icon (e.g., a cloud with an arrow) in the header could indicate "Offline changes pending."
*   **Success Feedback:** Once an action successfully synchronizes with the server, remove the pending indicator.
*   **Failure Feedback:** If an action ultimately fails to sync after all retries:
    *   Change the pending indicator to a failure indicator (e.g., a red 'X').
    *   Provide an option to retry the specific action or discard it.
    *   For chat messages, the failed message might be highlighted with an option to resend.
*   **Optimistic UI:** The UI should always reflect the user's intended state as quickly as possible, with pending indicators serving as a secondary status.

### Explicit Non-Goals

*   Full Service Worker rollout for caching all assets or intercepting all network requests is not a goal unless explicitly required by a separate brief. The Service Worker's role here is primarily for `background-sync`.
*   Complex real-time conflict resolution UIs (e.g., showing diffs and allowing manual merges) are out of scope for this initial phase.