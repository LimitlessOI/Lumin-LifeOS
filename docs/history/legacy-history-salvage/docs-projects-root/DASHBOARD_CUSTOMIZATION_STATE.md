<!-- SYNOPSIS: LifeOS Dashboard Local State Contract -->

# LifeOS Dashboard Local State Contract

## Goals
This contract defines the structure and behavior of client-side persistent state for the LifeOS Dashboard, enabling user customization of widget visibility, order, density, and pinning.

-   **User Customization:** Allow users to personalize their dashboard layout.
-   **Widget Management:** Store preferences for which widgets are visible and their display order.
-   **Density Control:** Support different visual density modes for the dashboard.
-   **Pinned Widgets:** Enable users to "pin" critical widgets, influencing their placement or persistence.
-   **Client-Side Persistence:** Initially leverage `localStorage` for immediate client-side state management.
-   **Future Server-Side Integration:** Establish a clear path for migrating state to server-side persistence without breaking existing client data.
-   **Schema Evolution:** Define a versioning strategy to handle future changes to the state schema gracefully.
-   **SSR/Client Hydration:** Ensure a consistent experience across server-side rendering and client-side hydration.

## Keys & Shapes

All dashboard state will be stored under a single top-level key in `localStorage`.

**Top-Level Key:** `lifeos_dashboard_state`

**Schema:**
```typescript
interface DashboardState {
  version: number; // Schema version for migration purposes
  widgetVisibility: Record<string, boolean>; // Key: widgetId, Value: true (visible) / false (hidden)
  widgetOrder: string[]; // Array of widgetIds in display order
  densityMode: DensityEnum; // Current display density
  pinnedWidgets: string[]; // Array of widgetIds that are pinned
}
```

**Example `widgetVisibility`:**
```json
{
  "lifeos-widget-mit": true,
  "lifeos-widget-score": true,
  "lifeos-widget-lumin-quick": false,
  "lifeos-widget-category-stubs": true
}
```

**Example `widgetOrder`:**
```json
[
  "lifeos-widget-mit",
  "lifeos-widget-score",
  "lifeos-widget-category-stubs",
  "lifeos-widget-lumin-quick"
]
```

**Initial State (Defaults):**
-   `version`: `1` (initial version)
-   `widgetVisibility`: All known widgets `true`.
-   `widgetOrder`: Default order as defined in `lifeos-dashboard.html`.
-   `densityMode`: `DensityEnum.STANDARD`.
-   `pinnedWidgets`: `[]` (empty by default).

## Density Enum

The `DensityEnum` defines the available display density modes for the dashboard.

```typescript
enum DensityEnum {
  COMPACT = 'compact',
  STANDARD = 'standard',
  SPACIOUS = 'spacious',
}
```

## Risks

-   **Schema Migration:** As the `DashboardState` schema evolves, migrating existing `localStorage` data from older versions (`version` field) will require careful implementation to avoid data loss or unexpected behavior.
-   **Data Consistency (Client vs. Server):** Once server-side persistence is introduced, mechanisms will be needed to reconcile `localStorage` state with server-provided state, especially during initial load or across different devices.
-   **SSR Hydration Mismatch:** If the server renders the dashboard with a default layout and the client then hydrates with a different layout from `localStorage`, a "flash of unstyled content" (FOUC) or layout shift may occur. Strategies like pre-fetching state on the server or client-side rendering of layout-dependent components might be necessary.
-   **`localStorage` Size Limits:** While unlikely for this specific state, storing excessively large objects in `localStorage` can lead to performance issues or hit browser storage limits.
-   **Security:** `localStorage` is not encrypted and is accessible via client-side scripts. While dashboard layout is not sensitive, this is a general consideration for any data stored there.
-   **User Experience:** Abrupt changes in widget visibility or order due to state loading or migration issues can be disruptive to the user.