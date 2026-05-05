# Queued Actions Offline Strategy for LifeOS Dashboard Builder

## Overview

This document outlines the strategy for enabling offline queuing and synchronization of builder actions within the LifeOS Dashboard. The primary goal is to allow users to initiate build-related operations (e.g., `build`, `task`, `execute`, `review`) even when their network connection is unavailable or unstable, with these actions being automatically synchronized once connectivity is restored. This enhances user experience and system resilience.

## Goals

*   **Enable Offline Action Initiation**: Users can trigger builder actions without an active network connection.
*   **Persistent Action Queue**: Actions initiated offline are stored persistently on the client-side.
*   **Automatic Synchronization**: Queued actions are automatically transmitted to the server upon network reconnection.
*   **User Feedback**: Provide clear feedback to the user regarding the status of queued, synchronizing, and completed actions.
*   **Conflict Handling**: Define a basic mechanism for identifying and presenting resolution options for conflicts arising from offline changes.

## Non-Goals

*   **Full Service Worker Rollout**: This strategy does not encompass a full Service Worker implementation for comprehensive offline asset caching or advanced network interception. The focus is solely on action queuing and synchronization.
*   **Real-time Collaborative Conflict Resolution**: Complex merging or real-time conflict resolution beyond basic "retry/discard" options is out of scope for this initial phase.
*   **Offline Data Access/Mutation**: This strategy does not cover offline access or modification of existing data (e.g., viewing build history offline). It is strictly for *initiating* new builder actions.

## Core Strategy: IndexedDB for Offline Queue

All builder actions initiated while offline or with unstable connectivity will be stored in a client-side IndexedDB database.

### IndexedDB Structure

A dedicated object store, e.g., `offline_builder_actions`, will be used. Each entry will represent a single builder action and contain:

*   `id`: Unique identifier for the action (e.g., UUID).
*   `actionType`: String representing the builder endpoint (e.g., `build`, `task`, `execute`, `review`).
*   `payload`: The full request body (JSON) for the builder action.
*   `timestamp`: Timestamp of when the action was initiated client-side.
*   `status`: Enum (`queued`, `sending`, `success`, `failed`, `conflict`, `deferred`).
*   `retries`: Number of retry attempts made.
*   `errorMessage`: Last error message received from the server, if any.
*   `deferredReason`: Optional string explaining why an action was deferred.

### Action Flow

1.  **Initiation**: When a user triggers a builder action, the client-side logic first checks network status.
2.  **Queueing**:
    *   If offline or network is unstable, the action is immediately stored in IndexedDB with `status: 'queued'`.
    *   If online, the action is attempted directly. If it fails due to network issues, it's then queued.
3.  **Persistence**: Actions remain in IndexedDB until successfully synchronized or explicitly discarded by the user.

## Synchronization Mechanism

Synchronization will be managed by a client-side module that monitors network connectivity and processes the IndexedDB queue.

### Process

1.  **Network Monitoring**: The client application will monitor network connectivity (e.g., using `navigator.onLine` and listening to `online`/`offline` events).
2.  **Queue Processing**:
    *   Upon detecting an `online` state, or at regular intervals while online, the synchronization module will attempt to process actions with `status: 'queued'`.
    *   Actions will be processed sequentially (FIFO) to maintain order of operations.
3.  **Transmission**:
    *   For each `queued` action, its `status` is updated to `sending`.
    *   The original `payload` is sent to the corresponding builder endpoint.
4.  **Response Handling**:
    *   **Success (2xx)**: The action is removed from IndexedDB, and the user is notified.
    *   **Client Error (4xx, excluding 409)**: The action's `status` is updated to `failed`, `errorMessage` is recorded, and the user is notified.
    *   **Conflict (409)**: The action's `status` is updated to `conflict`, `errorMessage` is recorded, and the user is prompted for resolution.
    *   **Server Error (5xx) / Network Error**: The action's `status` is reverted to `queued`, `retries` count is incremented, and a back-off retry strategy is applied.

### Retry Strategy

*   An exponential back-off strategy will be employed for network-related failures (5xx, network errors).
*   A maximum number of retries will be defined (e.g., 5 attempts). After exceeding this, the action's `status` will be set to `failed`, requiring manual intervention.

## Conflict Resolution User Experience (UX)

Conflicts primarily arise when an offline action attempts to modify a resource that has been changed on the server by another user or process in the interim.

### Detection

*   The server API should return a `409 Conflict` status code when a conflict is detected (e.g., optimistic locking failure, version mismatch).

### User Interface

1.  **Notification**: When an action's `status` becomes `conflict`, a prominent notification will appear in the dashboard, indicating that one or more actions could not be synchronized due to conflicts.
2.  **Conflict List**: A dedicated section (e.g., a modal or a sidebar panel) will list all conflicting actions, showing:
    *   Action type and timestamp.
    *   A summary of the original payload (e.g., target file path for `build` actions).
    *   The server's error message.
3.  **Resolution Options**: For each conflicting action, the user will be presented with options:
    *   **Retry**: Re-attempt the action. This is useful if the user has manually resolved the underlying issue on the server or if the conflict was transient.
    *   **Discard**: Permanently remove the action from the queue.
    *   **View Details**: Show the full payload to aid manual resolution.

## Deferred Actions

Some actions might be intentionally deferred by the user or automatically by the system if they require external conditions to be met (e.g., waiting for a specific resource to