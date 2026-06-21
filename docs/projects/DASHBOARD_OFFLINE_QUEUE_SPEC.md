<!-- SYNOPSIS: Project Brief: LifeOS Dashboard Offline Queued Actions -->

# Project Brief: LifeOS Dashboard Offline Queued Actions

## 1. Introduction

This brief outlines the strategy for enabling offline queuing and synchronization of user-initiated actions within the LifeOS Dashboard. The primary goal is to enhance user experience by allowing critical actions (e.g., adding MITs, sending chat messages) to be performed even when the device is offline, with these actions automatically syncing once connectivity is restored.

## 2. Goals

*   **Resilience**: Ensure user actions are not lost due to temporary network unavailability.
*   **Continuity**: Provide a seamless user experience, allowing interaction with the dashboard even when offline.
*   **Data Integrity**: Implement a robust mechanism for storing, retrying, and resolving conflicts for queued actions.
*   **Transparency**: Keep the user informed about the status of their offline actions (queued, syncing, failed).

## 3. Non-Goals

*   Full offline-first application: This project does not aim to make the entire dashboard fully functional offline (e.g., reading all historical data). The focus is specifically on queuing *write* operations.
*   Complex real-time collaborative conflict resolution: Initial conflict handling will prioritize user notification and manual resolution over automatic merging.
*   Extensive Service Worker implementation: A minimal Service Worker will be used primarily for background sync capabilities; a full PWA conversion is not in scope for this task.

## 4. Core Components & Strategy

### 4.1. IndexedDB for Persistent Storage

All user actions initiated while offline, or actions that fail to send immediately, will be stored in a local IndexedDB database.

*   **Database Name**: `lifeos_offline_db`
*   **Object Store**: `queued_actions`
*   **Schema**:
    *   `id`: `string` (UUID, primary key) - Unique identifier for each queued action.
    *   `type`: `string` - Categorizes the action (e.g., `'add_mit'`, `'toggle_mit'`, `'send_chat'`).
    *   `payload`: `object` - JSON object containing the data necessary to re-execute the action (e.g., `{ text: 'New MIT' }`, `{ commitmentId: 'uuid', isKept: true }`, `{ messages: [...] }`).
    *   `timestamp`: `number` - Unix timestamp when the action was initially queued.
    *   `status`: `string` - Current state: `'pending'`, `'syncing'`, `'failed'`, `'completed'`.
    *   `retries`: `number` - Count of retry attempts for failed actions.
    *   `error`: `string` (optional) - Last error message if the action failed.

### 4.2. Synchronization Mechanism

Synchronization will be triggered upon network connectivity restoration.

*   **Primary Trigger**: Web Background Sync API.
    *   A Service Worker will register for a `sync` event (e.g., `sync-lifeos-actions`).
    *   When the browser detects network connectivity, the Service Worker will be woken up to process the `sync` event.
*   **Fallback Trigger**: `navigator.onLine` event listener.
    *   If Background Sync API is not available or fails, the main application thread will listen for the `online` event and attempt to initiate a sync.
    *   A periodic check (e.g., every 30 seconds) when `navigator.onLine` is true could also be implemented as a safeguard.

### 4.3. Synchronization Process

1.  **Fetch Pending Actions**: When a sync is triggered, retrieve all actions with `status: 'pending'` or `status: 'failed'` from `queued_actions` in IndexedDB.
2.  **Process Actions Sequentially**: Iterate through the retrieved actions.
    *   For each action:
        *   Update its `status` to `'syncing'` in IndexedDB.
        *   Execute the corresponding API call using the `type` and `payload`.
        *   **On Success**:
            *   Update `status` to `'completed'`.
            *   Delete the action from IndexedDB.
        *   **On Failure**:
            *   Increment `retries`.
            *   Store the `error` message.
            *   If `retries` < `MAX_RETRIES` (e.g., 3-5 attempts): Update `status` to `'failed'` and re-queue for a future sync attempt (potentially with exponential backoff).
            *   If `retries` >= `MAX_RETRIES`: Update `status` to `'permanently_failed'`. This action will require user intervention.

### 4.4. Conflict Resolution UX

For this initial phase, conflicts will be handled by notifying the user and providing options for manual resolution.

*   **Optimistic UI Updates**: When a user performs an action offline, the UI will immediately reflect the change (e.g., the MIT appears in the list, the chat message is shown). This provides immediate feedback.
*   **Server-Side Conflict Detection**: The backend API should return appropriate HTTP status codes (e.g., `409 Conflict`, `404 Not Found` if an entity was deleted remotely) if a queued action cannot be applied cleanly due to a state mismatch.
*   **User Notification for Failed Actions**:
    *   If an action reaches `status: 'permanently_failed'`, a clear, persistent visual indicator will be displayed on the dashboard (e.g., a small badge, a dedicated "Offline Actions" section).
    *   Clicking this indicator will open a modal or dedicated view listing the failed actions, showing:
        *   The original action (`type`, `payload`).
        *   The server's error message.
        *   Options:
            *   **Retry**: Re-attempt sending the original action.
            *   **Edit & Retry**: Allow the user to modify the payload (e.g., rephrase a chat message, update an MIT text) and then retry.
            *   **Discard**: Remove the action from the queue, effectively canceling it.
*   **Visual Cues for Queued Actions**:
    *   Actions that are currently `pending` or `syncing` could have a subtle visual cue (e.g., a lighter color, a small clock icon, or a "syncing..." label) in the UI until they are successfully `completed`.

### 4.5. Deferred Actions

The entire mechanism described above inherently defers actions until network availability. The retry logic ensures that actions are deferred and re-attempted multiple times before being marked as permanently failed.

## 5. UI Integration (High-Level)

*   **Offline Status Indicator**: A small, non-intrusive banner or icon (e.g., in the header) will indicate "Offline Mode" when `navigator.onLine` is false.
*   **Sync Activity Indicator**: A subtle animation (e.g., a spinning icon next to the offline indicator) will show when actions are actively being synced.
*   **Failed Actions Counter**: A badge or counter will appear when there are `permanently_failed` actions requiring user attention.

## 6. Implementation Considerations

*   **New Client-Side Module**: A new JavaScript module (e.g., `public/shared/lifeos-offline-sync.js`) will encapsulate IndexedDB interactions and sync logic.
*   **Modification of Existing UI Handlers**: Existing functions like `addMIT()`, `toggleMIT()`, `sendMessage()` will be updated to first attempt to queue the action via `lifeos-offline-sync.js` instead of directly calling `API()`. The `lifeos-offline-sync.js` module will then handle the actual `API()` call and retries.
*   **Service Worker Registration**: A minimal Service Worker will be registered in `public/overlay/lifeos-dashboard.html` to enable background sync.

## 7. Open Questions / Future Enhancements

*   **Payload Size**: How to handle very large payloads (e.g., extensive chat histories) efficiently for offline storage and sync.
*   **Read-Only Data Caching**: Explore caching frequently accessed read-only data (e.g., calendar events, goals) to provide a richer offline experience beyond just queued writes.
*   **More Sophisticated Conflict Resolution**: For certain data types, consider implementing merge strategies rather than just user-review-and-retry.
*   **User Authentication Offline**: How to handle scenarios where the user's authentication token expires while offline.