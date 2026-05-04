# Dashboard Local State Contract

This document defines the contract for managing dashboard UI state locally, primarily via `localStorage`, with considerations for future server-side persistence and SSR.

## Goals

*   **Deterministic UI State:** Ensure consistent dashboard layout and widget presentation across user sessions and browser refreshes.
*   **User Customization:** Allow users to personalize widget visibility, order, and display density.
*   **Responsive Adaptation:** Support dynamic adjustments to layout based on viewport and user preferences.
*   **Future-Proofing:** Establish a clear contract that can be extended to server-side persistence without breaking existing client-side behavior.
*   **Performance:** Prioritize client-side rendering speed by leveraging `localStorage` for immediate state retrieval.

## Keys & Shapes

All `localStorage` keys will be prefixed with `lifeos:dashboard:`.

### Widget Visibility

*   **Key:** `lifeos:dashboard:widgetVisibility`
*   **Shape:** `Record<string, boolean>`
    *   Example: `{"builderStatus": true, "nextTask": false, "buildHistory": true}`
    *   Description: Maps widget IDs to a boolean indicating if they are visible (`true`) or hidden (`false`).

### Widget Order

*   **Key:** `lifeos:dashboard:widgetOrder`
*   **Shape:** `string[]`
    *   Example: `["builderStatus", "nextTask", "buildHistory", "councilReview"]`
    *   Description: An ordered array of widget IDs, defining their display sequence. Widgets not in this array (but visible) should append to the end or follow a default order.

### Density Mode

*   **Key:** `lifeos:dashboard:densityMode`
*   **Shape:** `string` (refer to Density Enum below)
    *   Example: `"balanced"`
    *   Description: The user's preferred visual density for the dashboard. This can be overridden or influenced by `pickDashboardDensity` based on viewport and other factors, as described in `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`.

### Pinned Widgets

*   **Key:** `lifeos:dashboard:pinnedWidgets`
*   **Shape:** `string[]`
    *   Example: `["builderStatus"]`
    *   Description: An array of widget IDs that are "pinned" to a specific, often fixed, position on the dashboard (e.g., a sidebar or top row).

### Schema Version

*   **Key:** `lifeos:dashboard:version`
*   **Shape:** `number`
    *   Example: `1`
    *   Description: Tracks the current schema version of the local dashboard state. Used for migration logic on schema bumps.

## Density Enum

The `densityMode` key will accept one of the following string values, aligning with the `pickDashboardDensity` utility:

*   `"compact"`: Minimal spacing, higher information density.
*   `"balanced"`: Default, moderate spacing.
*   `"airy"`: Increased spacing, lower information density.

## Risks

*   **Schema Mismatch:** Changes to the data shapes without a versioning and migration strategy can lead to corrupted or unreadable user preferences, requiring manual clearing of `localStorage`.
*   **Stale Data:** If server-side persistence is introduced later, `localStorage` data could become out of sync with the canonical server state, leading to inconsistent experiences.
*   **FOUC (Flash of Unstyled Content):** Without proper SSR integration, the initial client-side render might display a default layout before `localStorage` preferences are applied, causing a visual flicker.
*   **Performance Overhead:** While `localStorage` is generally fast, excessive or complex data structures could introduce minor parsing overhead on initial load.

## Versioning and Migration

To mitigate schema mismatch risks:

1.  **Version Check:** On application boot, read `lifeos:dashboard:version`.
2.  **Migration Logic:** If the stored version is older than the current application's expected version, execute a migration function. This function should:
    *   Read old keys.
    *   Transform data to the new schema.
    *   Write to new keys.
    *   Update `lifeos:dashboard:version` to the current version.
    *   If migration fails or is not possible, default to a clean state (clear all `lifeos:dashboard:` keys).

## SSR/Client Boundaries

*   **Client-Side (Primary):** The client is the authoritative source for reading and writing these local state preferences. On initial load, the client reads from `localStorage` to hydrate the UI. Any user interaction that changes these preferences (e.g., reordering widgets, toggling visibility) should update `localStorage`.
*   **SSR (Initial Render Optimization):** For optimal user experience and to prevent FOUC, the server *can* pre-render a default or inferred dashboard state. For example, it could render a default widget order and density. However, the client-side hydration process must then reconcile this with the user's `localStorage` preferences, applying any local overrides. The `DASHBOARD_DENSITY_INTEGRATION_NOTES.md` provides a good pattern for `resolveThemeMode` and `pickDashboardDensity` where SSR can provide an initial guess, and the client takes over for dynamic updates.