## Dashboard Local State Contract

This document defines the client-side contract for managing dashboard UI state, including widget visibility, order, density, and pinned status. It outlines the structure for local storage keys, data shapes, and considerations for versioning and SSR/client boundaries.

### Goals

- Establish a clear, versioned contract for client-side dashboard UI state.
- Define storage keys and data shapes for widget visibility, order, density mode, and pinned widgets.
- Outline a strategy for handling schema versioning and migration.
- Clarify the responsibilities of SSR and client-side rendering regarding this state.
- Avoid rebuilding existing persistence APIs; focus on the local contract.

### Keys & Shapes

All local storage keys will be prefixed with `lifeos_dashboard_` and include a version suffix (e.g., `_v1`).

#### Widget Visibility

-   **Purpose:** Controls which widgets are displayed to the user.
-   **Storage Key (localStorage):** `lifeos_dashboard_widget_visibility_v1`
-   **Shape:** An object mapping widget IDs to boolean visibility flags.
    ```typescript
    type WidgetVisibilityState = {
      [widgetId: string]: boolean; // true if visible, false if hidden
    };
    ```
-   **Example:** `{"builder-status": true, "task-queue": false}`

#### Widget Order

-   **Purpose:** Defines the display order of visible widgets.
-   **Storage Key (localStorage):** `lifeos_dashboard_widget_order_v1`
-   **Shape:** An array of widget IDs, representing their ordered sequence.
    ```typescript
    type WidgetOrderState = string[];
    ```
-   **Example:** `["builder-status", "council-activity", "task-queue"]`

#### Density Mode

-   **Purpose:** Controls the visual density of the dashboard layout.
-   **Storage Key (localStorage):** `lifeos_dashboard_density_v1`
-   **Shape:** A string representing one of the defined `DensityMode` enum values.
    ```typescript
    type DensityModeState = DensityMode; // See Density enum section below
    ```
-   **Example:** `"balanced"`

#### Pinned Widgets

-   **Purpose:** Identifies widgets that are "pinned" to a specific, persistent area of the dashboard (e.g., a sidebar or header).
-   **Storage Key (localStorage):** `lifeos_dashboard_pinned_widgets_v1`
-   **Shape:** An array of widget IDs that are currently pinned.
    ```typescript
    type PinnedWidgetsState = string[];
    ```
-   **Example:** `["quick-actions", "notifications"]`

### Density Enum

Based on the `pickDashboardDensity` utility, the supported density modes are:

```typescript
enum DensityMode {
  Compact = "compact",
  Balanced = "balanced",
  Airy = "airy",
}
```

### Versioning and Migration

-   **Versioning:** Each local storage key includes a `_v1` suffix. Future schema changes will increment this version (e.g., `_v2`).
-   **Migration Strategy:**
    -   On application boot, check the version of each stored item.
    -   If an older version is found, attempt a migration function.
    -   If migration fails or no migration path exists, clear the old key and apply default state.
    -   New keys should always be written with the current version.

### SSR/Client Boundaries

-   **Server-Side Rendering (SSR):**
    -   The server can provide an initial, default state for the dashboard layout (e.g., based on a generic desktop view or a user's persisted profile if available).
    -   This initial state should be injected into the HTML (e.g., via `data-` attributes on the root element or a script tag) to prevent layout shifts or "flash of unstyled content" (FOUC).
    -   Server does not directly interact with `localStorage`.
-   **Client-Side Rendering:**
    -   On hydration, the client reads the initial state provided by the server.
    -   Immediately after, the client attempts to load user-specific preferences from `localStorage` for each defined key.
    -   Local storage values override server-provided defaults where they exist.
    -   The client is responsible for dynamically updating these states based on user interactions (e.g., reordering widgets, changing density) and persisting them back to `localStorage`.
    -   Client-side logic (e.g., `pickDashboardDensity`) will react to viewport changes and update the density state.

### Risks

-   **Schema Migration Complexity:** As the dashboard evolves, managing multiple migration paths for different versions can become complex.
-   **LocalStorage Limits:** While unlikely for UI state, storing excessively large data sets in `localStorage` can lead to performance issues or storage limits.
-   **Hydration Mismatch:** If the server-rendered state and client-hydrated state (from localStorage) differ significantly, it can cause visual glitches or re-renders.
-   **Concurrency Issues:** Multiple browser tabs/windows accessing and modifying the same `localStorage` keys can lead to race conditions or inconsistent state.
-   **Security:** `localStorage` is not secure for sensitive data. This contract is strictly for UI preferences.