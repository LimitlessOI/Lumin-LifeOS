# LifeOS Dashboard: Offline Queued Actions Specification

## I. Introduction

This document outlines the strategy for enabling offline queuing of user actions within the LifeOS Dashboard. The primary goal is to enhance user experience by allowing critical actions to be performed even when network connectivity is unavailable or intermittent, with subsequent synchronization when online.

**Scope:**
*   Client-side storage of pending actions using IndexedDB.
*   Client-side synchronization mechanism for queued actions.
*   User experience (UX) for deferred actions and conflict resolution.

**Non-Goals:**
*   A full Service Worker implementation for general offline capabilities (e.g., caching all application assets, full offline browsing). The focus is specifically on action queuing and synchronization.

## II. Offline Queuing Strategy (IndexedDB)

### A. Storage Mechanism
*   **Technology**: IndexedDB will be used for persistent, client-side storage of user actions.
*   **Object Store**: A single object store named `lifeos_queued_actions` will be created within an IndexedDB database.
*   **Schema**: Each entry in `lifeos_queued_actions` will contain:
    *   `id`: (Auto-incrementing key) Unique identifier for the queued action.
    *   `type`: (String) A descriptive identifier for the action (e.g., `addMIT`, `toggleMIT`, `sendMessage`).
    *   `payload`: (Object) The original data payload intended for the API request (e.g., `{ text: 'New MIT', is_mit: true }`).
    *   `api_endpoint`: (String) The target API endpoint (e.g., `/api/v1/lifeos/commitments`).
    *   `http_method`: (String) The HTTP method (e.g., `POST`, `PUT`, `DELETE`).
    *   `timestamp`: (Number) Unix timestamp when the action was queued.
    *   `status`: (String) Current status: `pending`, `retrying`, `failed`, `completed`.
    *   `retries`: (Number) Count of retry attempts for the action.
    *   `error_message`: (String, optional) Last error message if the action failed.

### B. Action Capture
*   **API Interception**: A wrapper around the `fetch` API (e.g., `lifeosFetch`) will be implemented to intercept specific user-initiated API calls.
*   **Offline/Network Failure Handling**:
    *   If `navigator.onLine` is `false` at the time of the request, or if the `fetch` call results in a network error (e.g., `TypeError` for network issues, or specific HTTP status codes indicating transient server issues like 5xx), the action will be stored in `lifeos_queued_actions` with `status: 'pending'`.
    *   The original API call will be aborted or immediately resolved with a client-side indication of queuing.
*   **Online Success**: If the network is available and the API call is successful, the action proceeds as normal, and no queuing occurs.

### C. Synchronization
*   **Online Detection**: The system will monitor network status using `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`. Additionally, a periodic lightweight API health check (e.g., `GET /api/v1/builder/status`) will be performed to confirm actual connectivity.
*   **Retry Mechanism**:
    1.  When the application detects it's online (or on initial load if online), it will attempt to process all actions with `status: 'pending'` or `status: 'retrying'` from `lifeos_queued_actions`, ordered by `timestamp`.
    2.  For each action:
        *   Reconstruct the original API request using `api_endpoint`, `http_method`, and `payload`.
        *   Execute the request.
        *   **On Success (2xx status)**: Mark the action as `status: 'completed'` and remove it from IndexedDB.
        *   **On Transient Failure (e.g., 5xx, network error)**: Increment `retries`. If `retries` is below a defined threshold (e.g., 5), update `status: 'retrying'` and schedule a backoff retry (e.g., exponential backoff). If `retries` exceeds the threshold, update `status: 'failed'` and store `error_message`.
        *   **On Permanent Failure (e.g., 4xx client errors, validation errors)**: Update `status: 'failed'` and store `error_message`. These actions will require user intervention.

## III. Conflict Resolution

### A. Definition
A conflict occurs when a locally queued action, upon synchronization, cannot be applied to the server state as intended due to changes that have occurred on the server since the action was queued (e.g., another user modified the same resource, or the resource was deleted).

### B. Strategy
*   **Last-Write-Wins (LWW) for Simple Actions**: For actions like `addMIT`, `toggleMIT`, `addGoal`, where the intent is clear and idempotent or append-only:
    *   If the server rejects the action due to a conflict (e.g., a `409 Conflict` status, or a specific error message indicating the resource state is incompatible), the action will be marked `status: 'failed'`.
    *   For `toggleMIT`: If the server state already matches the desired state (e.g., client wants to mark MIT as kept, and server already shows it as kept), the action can be considered `completed` successfully.
*   **User Choice for Complex Actions**: For actions where LWW is insufficient or data loss is a concern (not immediately applicable to current dashboard features, but for future expansion), the user will be prompted to resolve the conflict.

### C. Conflict User Experience (UX)
*   **Persistent Notification**: A small, non-intrusive indicator (e.g., a badge on a sync icon in the header) will show the count of pending or failed actions.
*   **Review Interface**: A dedicated modal or a small "Offline Actions" widget will be accessible from the dashboard. This interface will allow users to:
    *   View a list of all `pending`, `retrying`, and `failed` actions.
    *   See details for each failed action, including the original payload and the `error_message` from the server.
    *   Manually **Retry** individual failed actions.
    *   **Discard** individual failed actions.
    *   **Retry All** pending/failed actions.

## IV. Deferred Actions User Experience

### A. Visual Cues
*   **Immediate Display**: Locally queued actions will be immediately reflected in the dashboard UI to provide a responsive experience.
*   **Pending Indicator**: UI elements representing locally queued but unsynced actions will display a visual cue (e.g., a small spinning sync icon, a slightly dimmed appearance, or a subtle border) to indicate their pending status.
*   **Success Confirmation**: Once an action is successfully synced with the server, its pending indicator will disappear, and it will appear as a fully confirmed item.
*   **Failure Indicator**: If an action fails to sync after all retries, a clear visual indicator (e.g., a red exclamation mark) will appear next to the item, prompting the user to review it in the "Offline Actions" interface.

### B. Feedback
*   **Toast Notifications**: Brief, non-blocking toast notifications will inform the user about significant sync events (e.g., "3 actions synced successfully!", "Failed to sync 1 action. Review required.").
*   **Status Messages**: The "Offline Actions" review interface will provide detailed status messages for each action.

### C. Dashboard Integration
*   The dashboard's data loading functions (e.g., `loadMITs`, `loadCalendar`) will be updated to first check IndexedDB for locally queued actions and display them alongside server-fetched data, ensuring a consistent view.
*   Local actions will be merged and deduplicated with server data, prioritizing local changes until server confirmation.