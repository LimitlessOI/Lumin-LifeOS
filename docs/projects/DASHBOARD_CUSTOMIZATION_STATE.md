# Dashboard UI State Contract

This document defines the client-side contract for managing the persistent UI state of the LifeOS dashboard. It outlines the structure and keys for storing user preferences locally, with considerations for future server-side persistence.

## Goals

- Define the client-side contract for managing dashboard UI state.
- Specify storage keys, data shapes, and versioning for widget visibility, order, density mode, and pinned widgets.
- Outline considerations for schema migration and SSR/client hydration.
- Non-goal: Implement a full persistence API or server-side storage. This contract focuses on the local storage mechanism.

## Keys & Shapes

All keys are stored in `localStorage` initially. Future server-side persistence will require a migration path for these local preferences.

-   **`dashboard:version`**: `number`
    -   **Purpose**: Tracks the schema version of stored dashboard preferences. This is crucial for managing migrations when the data structure evolves.
    -   **Example**: `1`
    -   **Storage**: `localStorage`
-   **`dashboard:widgetVisibility`**: `{ [widgetId: string]: boolean }`
    -   **Purpose**: Stores the visibility state for each dashboard widget. A `true` value indicates the widget is visible, `false` indicates it is hidden.
    -   **Example**: `{ "builder-status": true, "next-task": false, "build-history": true }`
    -   **Storage**: `localStorage`
-   **`dashboard:widgetOrder`**: `string[]`
    -   **Purpose**: Stores the ordered list of widget IDs, reflecting the user's preferred layout. The order of IDs in the array dictates the rendering order.
    -   **Example**: `["builder-status", "next-task", "build-history", "council-review"]`
    -   **Storage**: `localStorage`
-   **`dashboard:densityMode`**: `DensityMode`
    -   **Purpose**: Stores the user's preferred visual density for the dashboard. This preference informs the `pickDashboardDensity` utility.
    -   **Example**: `"balanced"`
    -   **Storage**: `localStorage`
-   **`dashboard:pinnedWidgets`**: `string[]`
    -   **Purpose**: Stores a list of widget IDs that the user has explicitly "pinned" to a prominent position (e.g., a sidebar or top row).
    -   **Example**: `["builder-status", "next-task"]`
    -   **Storage**: `localStorage`

## Density Enum

The `DensityMode` type defines the allowed values for the `dashboard:densityMode` preference. These values are used by the `pickDashboardDensity` utility to adjust UI spacing and layout.

```typescript
type DensityMode = 'compact' | 'airy' | 'balanced';
```

## Risks

-   **Schema Evolution & Migration**: Any changes to the structure or keys of the stored data will necessitate a migration strategy. Without a versioning mechanism (`dashboard:version`) and corresponding migration logic, existing user preferences could be lost or lead to application errors.
-   **`localStorage` Limitations**:
    -   **Size Constraints**: `localStorage` has a limited storage capacity (typically 5-10MB per origin). While UI state is generally small, this could become a concern for dashboards with an extremely large number of configurable widgets.
    -   **Synchronous Operations**: `localStorage` reads and writes are synchronous, which can block the main thread if operations are frequent or involve large data payloads, potentially leading to UI jank.
    -   **Cross-tab/window Conflicts**: Multiple browser tabs or windows accessing and modifying `localStorage` simultaneously can lead to race conditions and inconsistent state if not handled with care (e.g., using `StorageEvent` for communication).
    -   **No Server Synchronization**: `localStorage` is client-side only. Transitioning to server-side persistence for user preferences will require a separate synchronization layer and a robust migration path for existing local data.
-   **SSR/Client Hydration Mismatch**: If the initial server-rendered HTML does not perfectly align with the client-side state derived from `localStorage` during hydration, it can result in hydration errors, visual glitches (Flash of Unstyled Content - FOUC), or unexpected UI behavior. Careful reconciliation logic is required.
-   **Performance Impact**: Frequent updates to `localStorage` for highly dynamic UI elements could introduce performance overhead. Debouncing or throttling state updates can mitigate this.