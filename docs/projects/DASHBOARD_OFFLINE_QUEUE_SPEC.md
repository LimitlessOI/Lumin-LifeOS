# Offline Queued Actions Specification

This document outlines the strategy for implementing offline queued actions within the LifeOS Dashboard, leveraging client-side storage and synchronization mechanisms.

## 1. IndexedDB Storage Strategy

All user-initiated actions (e.g., adding an MIT, marking an MIT as complete, adding a chat message, updating a goal) that require server interaction will first be stored locally in an IndexedDB database if the application is offline or the network request fails.

### 1.1. Database Structure
- A dedicated IndexedDB database, e.g., `lifeos_offline_queue`.
- An object store, e.g., `queued_actions`, to hold action payloads.
- Each entry in `queued_actions` will include:
    - `id`: A unique client-generated ID (e.g., UUID).
    - `timestamp`: When the action was initiated.
    - `endpoint`: The API endpoint (e.g., `/api/v1/lifeos/commitments`).
    - `method`: HTTP method (e.g., `POST`, `PUT`, `DELETE`).
    - `payload`: The JSON body of the request.
    - `status`: `pending`, `retrying`, `completed`, `failed`.
    - `retries`: Number of retry attempts.
    - `error`: Last error message, if any.

### 1.2. Action Queuing
- When an API call is made:
    1. Attempt the network request.
    2. If the network request succeeds (HTTP 2xx), the action is considered complete.
    3. If the network request fails (network error, timeout, or specific server errors indicating transient issues), the action is immediately added to `queued_actions` with `status: 'pending'`.
    4. The UI should provide immediate feedback to the user that the action has been queued and will sync when online.

## 2. Synchronization Strategy (Background Sync)

Synchronization will primarily rely on the Web Background Synchronization API for robust offline-to-online transitions.

### 2.1. Registration
- A `sync` event will be registered (e.g., `lifeos-sync-queue`) when an action is added to `queued_actions` and the browser detects a network change or becomes online.
- This registration will be handled by a minimal Service Worker (see Non-Goals for scope).

### 2.2. Sync Process
- When the `sync` event fires:
    1. The Service Worker will iterate through `queued_actions` with `status: 'pending'` or `status: 'retrying'`.
    2. For each action, it will attempt to re-send the original API request using the stored `endpoint`, `method`, and `payload`.
    3. On successful server response:
        - The action will be removed from `queued_actions` or marked `status: 'completed'`.
        - The UI will be notified (e.g., via `postMessage` to clients) to refresh relevant data.
    4. On failure:
        - Increment `retries`.
        - Update `status` to `retrying` and store the `error`.
        - Implement exponential backoff for retries.
        - If `retries` exceed a threshold, mark `status: 'failed'` and potentially notify the user for manual intervention.

## 3. Conflict Resolution User Experience (UX)

Conflicts arise when an offline change clashes with a server-side change to the same data.

### 3.1. Detection
- Server APIs should return specific HTTP status codes (e.g., 409 Conflict) or include metadata (e.g., `ETag`, `last_modified_at`) to indicate a conflict.
- The sync process will detect these conflict responses.

### 3.2. Resolution Strategy (Deferred)
- For initial implementation, conflict resolution will be *deferred*.
- When a conflict is detected during sync:
    1. The queued action's `status` will be set to `failed` with a specific `error` message indicating a conflict.
    2. The user will be notified via a persistent UI element (e.g., a banner or notification center) that "Some offline changes could not be synced due to conflicts."
    3. The notification will provide an option to:
        - **Review and Resolve:** Open a dedicated UI to show the client's version vs. the server's version, allowing the user to choose which version to keep or to merge manually. (Future enhancement)
        - **Discard:** Permanently remove the conflicting queued action.
        - **Retry:** Re-attempt the sync, potentially overwriting the server (if the API supports it, or if the user explicitly chooses).

## 4. Deferred Actions

All actions queued via IndexedDB are inherently deferred until network availability and successful synchronization. The UI should reflect the pending state of these actions.

### 4.1. UI Feedback
- When an action is queued offline, the UI should immediately update to reflect the user's intended change (optimistic UI).
- A visual indicator (e.g., a small cloud icon, a "pending sync" badge) should appear next to the affected item or in a global status bar, indicating that the change is local and awaiting synchronization.
- If a queued action fails after multiple retries, the UI should clearly indicate this failure and prompt the user for resolution.

## Non-Goals

- **Full Service Worker Rollout:** A full-fledged Service Worker for caching all assets, offline-first navigation, etc., is explicitly *not* a goal unless a future brief specifically requires it. The Service Worker's role here is limited to registering and handling `sync` events for the offline queue.
- **Complex Real-time Conflict Merging:** The initial conflict resolution strategy is notification-based with manual user intervention (discard/retry). Automatic merging of complex data structures is out of scope.
- **Offline Asset Caching:** This specification does not cover caching of application assets (HTML, CSS, JS, images) for offline access.
The brief file `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was not found, making the specification incomplete for grounding in existing documentation.