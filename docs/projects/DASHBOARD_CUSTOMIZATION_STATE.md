# Dashboard Layout Local State Contract

This document defines the contract for managing dashboard widget layout preferences locally within the client, serving as a foundational specification for future persistence mechanisms. It focuses on the structure and behavior of client-side state, independent of a full persistence API.

## Goals

- Define a clear, versioned schema for client-side dashboard layout preferences.
- Specify data structures for widget visibility, order, density mode, and pinned status.
- Outline considerations for storage location (local vs. server) and schema migration.
- Establish boundaries for SSR and client-side state management.

## Keys & Shapes

The local state contract will manage the following preferences, stored under a single top-level key in `localStorage` (e.g., `lifeos_dashboard_layout_v1`).

### Top-Level State Object

```typescript
interface DashboardLayoutState {
  version: number; // Schema version for migration
  widgetVisibility: Record<string, boolean>; // Map of widgetId to its visibility status
  widgetOrder: string[]; // Ordered array of widgetIds
  densityMode: DensityMode; // Current display density
  pinnedWidgets: string[]; // Array of widgetIds that are pinned
}
```

### Individual Keys (for `localStorage` or future server storage)

- **`dashboardLayoutState.version`**:
    - **Type**: `number`
    - **Purpose**: Tracks the schema version of the stored layout state. Incremented on breaking changes to facilitate migration.
    - **Example**: `1`
- **`dashboardLayoutState.widgetVisibility`**:
    - **Type**: `Record<string, boolean>`
    - **Purpose**: Stores the visibility status for each widget. Keys are widget IDs, values are `true` (visible) or `false` (hidden).
    - **Example**: `{ "builderStatus": true, "taskQueue": false, "recentBuilds": true }`
- **`dashboardLayoutState.widgetOrder`**:
    - **Type**: `string[]`
    - **Purpose**: An ordered array of widget IDs, representing their display sequence on the dashboard.
    - **Example**: `["builderStatus", "recentBuilds", "taskQueue"]`
- **`dashboardLayoutState.densityMode`**:
    - **Type**: `DensityMode` (see enum below)
    - **Purpose**: The user's preferred display density for widgets.
    - **Example**: `"STANDARD"`
- **`dashboardLayoutState.pinnedWidgets`**:
    - **Type**: `string[]`
    - **Purpose**: An array of widget IDs that the user has chosen to "pin" to a specific location or state.
    - **Example**: `["builderStatus"]`

### Storage Strategy

- **Initial**: `localStorage` will be used for client-side persistence.
- **Future**: Transition to server-backed persistence will involve migrating `localStorage` data to the server and then fetching preferences from the server on subsequent loads. The client-side contract will remain largely the same, but the read/write operations will abstract the storage layer.

## Density Enum

```typescript
enum DensityMode {
  COMPACT = "COMPACT",
  STANDARD = "STANDARD",
  SPACIOUS = "SPACIOUS",
}
```

- **`COMPACT`**: Minimal padding, smaller fonts, more information per screen area.
- **`STANDARD`**: Default, balanced layout.
- **`SPACIOUS`**: Increased padding, larger elements, less information per screen area.

## Risks

- **Schema Migration Complexity**: As the `version` number increases, client-side migration logic will be required to transform older state schemas to the current one. This can become complex if not managed carefully.
- **SSR/Client Hydration Mismatch**: If initial state is rendered on the server (SSR) and then hydrated on the client, discrepancies between the server-rendered state and the client's `localStorage` state could lead to visual "flicker" or incorrect initial rendering. A strategy for hydrating client state from `localStorage` *after* initial SSR render, or passing initial state from server, is crucial.
- **Data Consistency (Future)**: When transitioning to server-backed persistence, ensuring data consistency between client-side caches (`localStorage`) and the server will be a challenge, especially with multiple client sessions or devices.
- **Performance**: Storing large amounts of data in `localStorage` can impact initial page load performance, though for dashboard layout preferences, this is unlikely to be a significant issue.
- **Race Conditions**: If multiple browser tabs are open and modifying `localStorage` simultaneously, race conditions could lead to inconsistent state. This is generally mitigated by last-write-wins or more sophisticated synchronization if needed.