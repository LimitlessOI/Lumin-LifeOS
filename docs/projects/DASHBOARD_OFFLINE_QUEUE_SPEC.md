# LifeOS Dashboard Offline Capabilities Specification

## Goal:
Enable core user interactions on the LifeOS Dashboard to function reliably when offline, with queued actions synchronizing automatically upon network restoration.

## Scope:
This specification outlines the strategy for client-side data persistence and synchronization for user-initiated actions and critical dashboard data.

### 1. Offline Data Storage Strategy (IndexedDB)

*   **Mechanism:** Utilize the browser's IndexedDB API for persistent, structured client-side data storage.
*   **Object Stores:**
    *   `offline_queue`: Stores user actions performed while offline, awaiting synchronization.
        *   **Schema:**
            *   `id`: Unique identifier (e.g., UUID or timestamp-based).
            *   `action_type`: String representing the API endpoint/action (e.g., `POST /api/v1/lifeos/commitments`, `PUT /api/v1/lifeos/commitments/{id}/keep`).
            *   `method`: HTTP method (e.g., `POST`, `PUT`, `DELETE`).
            *   `payload`: JSON object of the request body.
            *   `timestamp`: When the action was queued.
            *   `status`: `pending`, `retrying`, `failed`.
            *   `retries`: Number of retry attempts.
    *   `cached_data`: Stores read-only dashboard data for offline viewing.
        *   **Schema:**
            *   `key`: Identifier for the data type (e.g., `mits`, `calendar_events`, `goals`, `scores`, `chat_messages`).
            *   `data`: JSON blob of the latest fetched data.
            *   `last_updated`: Timestamp of the last successful fetch.

### 2. Synchronization Strategy

*   **Primary Mechanism (Background Sync API):**
    *   A minimal Service Worker will be registered to handle the `sync` event.
    *   When an action is queued offline, a `sync` tag (e.g., `lifeos-sync-actions`) will be registered.
    *   Upon network restoration, the Service Worker will wake up, process the `offline_queue`, and attempt to send queued requests to the LifeOS API.
*   **Fallback/Manual Retry:**
    *   If Background Sync is unavailable or for immediate feedback, the dashboard's `API` helper will detect network status.
    *   On network recovery (e.g., `online` event, or successful API call after previous failure), a manual sweep of `offline_queue` will be triggered.
*   **Synchronization Process:**
    1.  **Queueing:** When an API call fails due to network issues, the request details are stored in `offline_queue` with `status: 'pending'`. The UI is updated optimistically.
    2.  **Execution:** The Service Worker (or manual retry logic) iterates through `offline_queue` items with `status: 'pending'` or `status: 'retrying'`.
    3.  **API Call:** Each queued action is re-sent to the LifeOS API.
    4.  **Resolution:**
        *   **Success:** The action is removed from `offline_queue`.
        *   **Network Failure:** `status` is set to `retrying`, `retries` incremented.
        *   **Server Error (non-network):** `status` is set to `failed`. User notification may be triggered.

### 3. Conflict Resolution User Experience

*   **Optimistic UI:** User actions (e.g., marking an MIT complete, adding a chat message) will immediately reflect in the dashboard UI, even if offline.
*   **Server-Side Authority:** The LifeOS API remains the source of truth. Conflicts are primarily resolved server-side.
*   **Simple Conflict Handling (Initial):**
    *   For most actions (e.g., MIT toggles, chat messages), a "last-write-wins" approach will be implicitly handled by the server's eventual consistency.
    *   If a queued action results in a server-side conflict (e.g., trying to update an entity that was deleted on the server), the server will return an appropriate error.
    *   **User Notification:** Failed sync actions will be indicated to the user (e.g., a small banner or icon indicating "Offline changes failed to sync"). Details of failed actions can be viewed in a dedicated "Sync Status" section (deferred for later implementation).
*   **Deferred Complexities:** Advanced merge UIs or explicit user choices for conflict resolution are not part of this initial specification.

### 4. Deferred Actions (Client-side queuing)

*   **API Interception:** The dashboard's `API` helper function will be enhanced to:
    *   Check `navigator.onLine` status.
    *   Attempt API calls.
    *   If `navigator.onLine` is false, or a network-related fetch error occurs, queue the request in `offline_queue`.
    *   For `GET` requests, if offline, attempt to retrieve data from `cached_data` before failing.
*   **UI Feedback:** Provide clear visual cues when the dashboard is operating offline and when actions are queued for sync.

## Non-Goals:

*   Full Service Worker implementation for caching all static assets (HTML, CSS, JS, images) to enable complete offline browsing of the entire application. The focus is specifically on data synchronization and user action queuing.
*   Real-time, bidirectional conflict resolution beyond basic server-side handling.
*   Complex user interfaces for reviewing and manually resolving individual data conflicts.