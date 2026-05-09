# Dashboard Local State Contract

This document defines the contract for managing the local, client-side state of the LifeOS dashboard, covering widget visibility, order, density mode, and pinned widgets. This contract is designed to facilitate consistent user experience across sessions and to provide a clear path for future server-side persistence.

## Goals

*   **Define State Schema:** Establish a clear, versioned schema for dashboard layout preferences stored client-side.
*   **Enable Persistence:** Allow user preferences for dashboard layout to persist across browser sessions using `localStorage`.
*   **Support Dynamic Layout:** Provide mechanisms for widgets to be dynamically shown/hidden, reordered, and for the overall dashboard density to adjust.
*   **Prepare for Server Sync:** Design the local contract with an eye towards eventual synchronization with a server-side user profile or settings service.
*   **Minimize FOUC:** Ensure a smooth transition between server-rendered defaults and client-side personalized states.

## Keys & Shapes

All `localStorage` keys will be prefixed with `lifeos-dashboard-` to prevent collisions. Data will be stored as JSON strings.

### `lifeos-dashboard-state-version`

*   **Purpose:** Tracks the schema version of the stored dashboard state for migration purposes.
*   **Shape:** `string` (e.g., "1.0.0")
*   **Example:** `"1.0.0"`

### `lifeos-dashboard-widget-visibility`

*   **Purpose:** Stores the visibility status for each dashboard widget.
*   **Shape:** `Record<string, boolean>` where keys are widget IDs and values indicate visibility (`true` for visible, `false` for hidden).
*   **Example:**
    ```json
    {
      "builder-status-widget": true,
      "next-task-widget": false,
      "build-history-widget": true
    }
    ```

### `lifeos-dashboard-widget-order`

*   **Purpose:** Defines the display order of visible widgets.
*   **Shape:** `string[]` (an ordered array of widget IDs). Only widgets present in this array and marked as `true` in `lifeos-dashboard-widget-visibility` should be rendered.
*   **Example:**
    ```json
    [
      "builder-status-widget",
      "build-history-widget",
      "council-review-widget"
    ]
    ```

### `lifeos-dashboard-density-mode`

*   **Purpose:** Stores the user's preferred or last-resolved visual density for the dashboard.
*   **Shape:** `DensityMode` enum value (see "Density Enum" section below).
*   **Example:** `"balanced"`

### `lifeos-dashboard-pinned-widgets`

*   **Purpose:** Stores the IDs of widgets that are "pinned" to a specific area (e.g., a sidebar or top rail).
*   **Shape:** `string[]` (an ordered array of widget IDs).
*   **Example:**
    ```json
    [
      "quick-actions-widget",
      "notifications-widget"
    ]
    ```

## Density Enum

Based on the `pickDashboardDensity` utility described in `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, the supported density modes are:

*   `"compact"`: Minimal spacing, high information density.
*   `"balanced"`: Default spacing, good balance of information and readability.
*   `"airy"`: Generous spacing, relaxed visual feel.

These values will be used for the `lifeos-dashboard-density-mode` key.

## Versioning and Migration

*   **Versioning:** A `lifeos-dashboard-state-version` key will store the current schema version. This allows for future schema changes without breaking existing user preferences.
*   **Migration:** On application boot, the client-side state manager will read the `lifeos-dashboard-state-version`. If it's older than the current application's expected version, a migration function will be triggered. This function will transform the old state schema into the new one, update the version, and persist the migrated state. If no version is found, it implies a first-time user or an old, unversioned state, and default values will be applied.

## SSR/Client Boundaries

*   **Server-Side Rendering (SSR):**
    *   Initial dashboard layout (default widget visibility, order, and density) can be rendered on the server. This prevents a Flash of Unstyled Content (FOUC) and provides a fast initial paint.
    *   The server can inject default CSS classes (e.g., `density-balanced`) directly into the HTML.
    *   No `localStorage` interaction occurs on the server.
*   **Client-Side Hydration and Interaction:**
    *   Upon hydration, client-side JavaScript will read the `localStorage` keys.
    *   If `localStorage` contains user preferences, these will override the server-rendered defaults.
    *   The client-side layout manager will then apply the appropriate CSS classes and render widgets based on the persisted state.
    *   All dynamic updates (e.g., user reordering widgets, changing density, toggling visibility) will be handled client-side and persisted back to `localStorage`.
    *   As noted in `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, client-side evaluation for density based on `viewportWidth` is crucial and will likely override any SSR-provided default quickly.

## Risks

*   **`localStorage` Limits:** While dashboard state is generally small, excessive data or frequent writes could hit `localStorage` size limits or cause performance issues.
*   **Schema Evolution:** Complex migrations can be error-prone. Keeping the schema simple and backward-compatible where possible is key.
*   **Race Conditions:** If a user has multiple tabs open, concurrent modifications to `localStorage` could lead to unexpected state. A simple "last write wins" approach is usually sufficient for UI preferences, but more robust solutions (e.g., `StorageEvent` listeners) might be considered if conflicts become problematic.
*   **Data Integrity:** Malformed JSON in `localStorage` could crash the client-side application. Robust parsing with error handling is required.
*   **FOUC on State Mismatch:** If the server-rendered default state significantly differs from the client-side persisted state, a brief visual "jump" might occur during hydration. Careful design of default states and client-side application of preferences can mitigate this.
*   **Future Server Sync Complexity:** Designing the local contract to be easily transferable to a server-side persistence model requires foresight. Changes to the local contract might necessitate changes to the server contract later.