# Offline Queued Actions for LifeOS Dashboard

## Introduction
This specification outlines the strategy for enabling users to perform key actions within the LifeOS Dashboard while offline. Actions initiated during periods of no network connectivity will be queued locally and automatically synchronized with the backend when an internet connection is restored. This enhances the dashboard's resilience and usability in intermittent network environments.

## Goals
*   **Offline Capability:** Allow users to initiate critical dashboard actions (e.g., adding/toggling MITs, sending chat messages) even when offline.
*   **Local Persistence:** Store pending actions reliably using IndexedDB on the client-side.
*   **Automatic Synchronization:** Implement a mechanism to automatically detect network availability and synchronize queued actions with the LifeOS backend.
*   **User Feedback:** Provide clear visual indicators and notifications regarding the status of offline actions (queued, syncing, synced, failed, conflicted).
*   **Basic Conflict Resolution:** Define a user experience for handling actions that fail due to conflicts or permanent errors during synchronization.

## Non-Goals
*   Full Service Worker implementation for comprehensive asset caching or complex network interception strategies beyond what is necessary for background data synchronization. The primary focus is on data persistence and synchronization, not full offline application availability.
*   Real-time, bidirectional offline data synchronization for all dashboard data. This specification focuses on user-initiated *actions*.

## Strategy Outline

### 1. IndexedDB Storage Strategy
*   **Database:** Create a dedicated IndexedDB database (e.g., `lifeos_offline_db`).
*   **Object Stores:** Establish object stores for each type of action that can be queued offline. Examples include:
    *   `queued_commitments`: For MIT additions, toggles, and updates.
    *   `queued_chat_messages`: For user messages sent to Lumin.
*   **Action Schema:** Each entry in an object store will adhere to a consistent schema:
    *   `id` (string): A unique client-generated UUID for the action.
    *   `actionType` (string): A descriptive identifier for the action (e.g., `'addMIT'`, `'toggleMIT'`, `'sendMessage'`).
    *   `payload` (object): The data required to execute the action on the server (e.g., `{ text: 'New MIT', is_mit: true }`, `{ commitmentId: 'uuid', kept_at: 'timestamp' }`, `{ messages: [...] }`).
    *   `timestamp` (number): Unix timestamp when the action was initiated client-side.
    *   `status` (string): Current state of the action (`'pending'`, `'syncing'`, `'success'`, `'failed'`, `'conflict'`).
    *   `retries` (number): Count of synchronization attempts.
    *   `error` (string, optional): Last error message if the action failed.

### 2. Offline Detection and Action Queuing
*   **Network Status:** Utilize `navigator.onLine` and listen for `online`/`offline` events to determine network connectivity.
*   **Action Interception:** When `navigator.onLine` is `false` (or an API call fails due to network error):
    *   Intercept outgoing API calls for supported actions.
    *   Instead of attempting `fetch`, store the action's `actionType` and `payload` in the appropriate IndexedDB object store with `status: 'pending'`.
    *   **Optimistic UI:** Immediately update the dashboard UI to reflect the action's outcome (e.g., show a new MIT, display a chat message) but with a visual cue indicating it's pending offline synchronization.

### 3. Synchronization Strategy (Background Sync / Online Fallback)
*   **Background Sync API (Preferred):** If a Service Worker is present, leverage the `Background Sync API` for robust synchronization.
    *   Register a sync tag (e.g., `'sync-offline-actions'`) when an action is queued.
    *   The Service Worker will be woken up when connectivity is restored to process pending actions.
*   **Fallback (if no Service Worker or for immediate sync):**
    *   On `online` event, or periodically (e.g., every 30-60 seconds) when `navigator.onLine` is `true`, initiate a synchronization attempt.
    *   **Synchronization Flow:**
        1.  Fetch all actions with `status: 'pending'` from IndexedDB.
        2.  For each action:
            *   Set `status: 'syncing'`.
            *   Attempt the corresponding API call using the stored `payload`.
            *   On successful API response (2xx): Mark action `status: 'success'` and remove it from IndexedDB. Update UI if necessary (e.g., remove pending indicator).
            *   On transient API failure (e.g., 5xx, network timeout): Increment `retries`, set `status: 'failed'`, and re-queue for a later attempt (implement exponential backoff for retries).
            *   On permanent API failure (e.g., 4xx client error, data validation error, conflict): Mark `status: 'conflict'` or `status: 'failed'` and trigger a user notification.

### 4. Conflict Resolution User Experience (UX)
*   **Conflict Detection:** A conflict occurs when a queued action cannot be successfully applied to the server due to a mismatch with the current server state (e.g., trying to toggle an MIT that was already deleted, or a chat message failing server-side validation).
*   **Dashboard Notification:**
    *   Display a prominent, non-intrusive notification (e.g., a banner or a small icon in the header) indicating "Offline actions require attention."
    *   A dedicated "Offline Actions" section or modal will list all actions with `status: 'conflict'` or `status: 'failed'`.
*   **Action Details:** For each conflicting action, display:
    *   The original action description (e.g., "Add MIT: 'Buy groceries'").
    *   The reason for the conflict/failure (e.g., "MIT already exists," "Invalid chat message content").
    *   The timestamp of the original action.
*   **User Options:** Provide clear options for the user to resolve conflicts:
    *   **"Retry"**: Re-attempt synchronization. Useful if the user has manually resolved the underlying issue on the server or if the conflict was transient.
    *   **"Discard"**: Permanently remove the action from the queue.
    *   **"Edit & Retry"**: For certain actions (e.g., chat messages), allow the user to modify the payload before retrying.
    *   **"View Server State"**: Link to the relevant part of the dashboard to see the current server state and manually reconcile.

### 5. Deferred Actions
*   All actions stored in IndexedDB with `status: 'pending'` are by definition deferred until network connectivity is available and synchronization is attempted.
*   **Prioritization:** Actions will generally be processed in the order they were queued (FIFO).
*   **User Feedback:** The UI will clearly differentiate between actions that are successfully processed and those that are still pending synchronization, using distinct visual cues (e.g., a subtle greyed-out state, a small clock icon, or a "queued" badge).