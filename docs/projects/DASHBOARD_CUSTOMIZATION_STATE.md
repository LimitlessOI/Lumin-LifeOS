SPECIFICATION INCONSISTENCY: `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is referenced but not found in REPO FILE CONTENTS. This documentation will proceed without referencing its content.

# Dashboard Layout State Contract

## Goals

This contract defines the structure and storage mechanisms for user-specific dashboard layout preferences. The primary goal is to enable client-side persistence of widget visibility, order, density mode, and pinned status, allowing for a personalized and consistent user experience across sessions. This contract focuses on the local state representation, deferring full server-side persistence API design to future tasks.

## Keys & shapes

All dashboard layout preferences will be stored under a single top-level key in `localStorage` to facilitate atomic updates and versioning.

*   **Storage Location:** `localStorage` (client-side only)
*   **Top-level Key:** `lifeos_dashboard_layout_config`
*   **Shape:**
    ```typescript
    interface DashboardLayoutConfig {
      /**
       * Schema version for migration purposes.
       * Increment this number when the structure of DashboardLayoutConfig changes.
       */
      version: number;
      /**
       * A map indicating the visibility state of each widget.
       * Keys are widget IDs (e.g., 'lifeos-widget-mit').
       * Value is `true` if visible, `false` if hidden.
       * Widgets not present in this map are assumed to be visible by default.
       */
      widgetVisibility: { [widgetId: string]: boolean };
      /**
       * An ordered array of widget IDs representing their display sequence.
       * Widgets not in this array but present in the DOM should be appended
       * according to their default DOM order.
       */
      widgetOrder: string[];
      /**
       * The selected visual density mode for the dashboard.
       */
      densityMode: DensityMode;
      /**
       * An array of widget IDs that are designated as "pinned".
       * The UI logic will determine how pinned widgets are rendered (e.g., in a dedicated rail).
       */
      pinnedWidgets: string[];
    }
    ```

*   **Default Values (if `lifeos_dashboard_layout_config` is not found or invalid):**
    *   `version`: `1` (current version)
    *   `widgetVisibility`: `{}` (all widgets visible by default)
    *   `widgetOrder`: `[]` (default DOM order)
    *   `densityMode`: `'balanced'`
    *   `pinnedWidgets`: `[]`

## Density enum

The `DensityMode` enum defines the possible visual density settings for the dashboard, as derived from `pickDashboardDensity` in `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`.

```typescript
type DensityMode = 'compact' | 'airy' | 'balanced';
```

## Risks

1.  **Schema Migration:** Changes to the `DashboardLayoutConfig` interface will require migration logic based on the `version` field. Failure to implement robust migration can lead to data loss or unexpected UI behavior for existing users.
2.  **Client-side Only Persistence:** Relying solely on `localStorage` means preferences are not synchronized across devices or browser instances. This is a known limitation given the non-goal of a full persistence API, but it's a UX consideration.
3.  **SSR/Client Hydration Mismatch:** If the server renders the initial HTML with default layout settings, and the client-side JavaScript then applies `localStorage` preferences, a "flash of unstyled content" or layout shift may occur.
4.  **Performance:** Frequent reads/writes to `localStorage` or complex DOM manipulations based on these settings (especially on `window.onresize`) could impact client-side performance, particularly on lower-end devices.
5.  **Widget ID Consistency:** Any changes to widget IDs in the HTML must be reflected in the client-side logic that manages `widgetVisibility`, `widgetOrder`, and `pinnedWidgets` to avoid orphaned or misidentified preferences.