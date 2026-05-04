# Dashboard Local/State Contract

This document defines the contract for managing dashboard-specific UI state locally (primarily via `localStorage`) and outlines considerations for future server-side persistence and SSR integration.

## Goals

-   Define clear storage keys and data shapes for core dashboard UI preferences.
-   Establish a versioning strategy for local state to support future schema migrations.
-   Outline the interaction between client-side state management and Server-Side Rendering (SSR).
-   Ensure consistency in widget visibility, order, density, and pinned status across user sessions.

## Keys & Shapes

All `localStorage` keys will be prefixed with `lifeos.dashboard.` to prevent collisions.

### 1. Dashboard State Version

-   **Purpose:** To enable schema migration for local state.
-   **Key:** `lifeos.dashboard.version`
-   **Shape:** `string` (e.g., `"1.0.0"`)
-   **Storage:** `localStorage`
-   **SSR/Client Boundary:**
    -   **SSR:** Not directly used during SSR for initial render, but the client-side application will check this version on boot.
    -   **Client:** On application load, compare the stored version with the current application's expected schema version. If different, trigger migration logic (e.g., clear old keys, apply defaults, or transform data).

### 2. Visible Widget IDs

-   **Purpose:** Controls which widgets are displayed on the dashboard.
-   **Key:** `lifeos.dashboard.visibleWidgetIds`
-   **Shape:** `string[]` (an ordered array of widget identifiers)
-   **Example:** `["widget-a", "widget-c", "widget-b"]`
-   **Storage:** `localStorage`
-   **SSR/Client Boundary:**
    -   **SSR:** Initial widget visibility might be determined by server-side user preferences or a default set. This state should be embedded in the initial HTML to prevent layout shifts.
    -   **Client:** After hydration, client-side logic will reconcile the SSR-provided state with `localStorage`. User interactions (adding/removing widgets) will update this key.

### 3. Widget Order

-   **Purpose:** Defines the display order of widgets on the dashboard.
-   **Key:** `lifeos.dashboard.widgetOrder`
-   **Shape:** `string[]` (an ordered array of widget identifiers)
-   **Example:** `["widget-a", "widget-b", "widget-c"]`
-   **Storage:** `localStorage`
-   **SSR/Client Boundary:**
    -   **SSR:** Similar to visible widgets, initial order can be server-determined.
    -   **Client:** Drag-and-drop or other reordering actions will update this key. This array should ideally be a superset or match the `visibleWidgetIds` for consistency.

### 4. Dashboard Density Mode

-   **Purpose:** Controls the visual spacing and compactness of the dashboard UI.
-   **Key:** `lifeos.dashboard.densityMode`
-   **Shape:** `string` (enum: see "Density Enum" section below)
-   **Example:** `"balanced"`
-   **Storage:** `localStorage`
-   **SSR/Client Boundary:**
    -   **SSR:** The initial density class should be applied to the main dashboard container (`<html>` or `<body>` or a specific dashboard `div`) during server-side rendering to prevent FOUC. This can be based on a default or a user preference from the server.
    -   **Client:** The `pickDashboardDensity` utility (as per `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`) will be used to dynamically determine and update this value based on viewport, widget count, and pinned rail status. User overrides will also update this key.

### 5. Pinned Widget IDs

-   **Purpose:** Identifies widgets that are "pinned" to a specific area or have special display properties (e.g., a fixed rail).
-   **Key:** `lifeos.dashboard.pinnedWidgetIds`
-   **Shape:** `string[]` (an array of widget identifiers)
-   **Example:** `["widget-d", "widget-e"]`
-   **Storage:** `localStorage`
-   **SSR/Client Boundary:**
    -   **SSR:** Initial pinned state can be server-determined.
    -   **Client:** User actions to pin/unpin widgets will update this key. The presence of pinned widgets (i.e., `pinnedWidgetIds.length > 0`) will influence `pickDashboardDensity`.

## Density Enum

The `densityMode` key will accept one of the following string values, as defined by the `pickDashboardDensity` utility:

-   `"compact"`: Minimal spacing, high information density.
-   `"airy"`: Increased spacing, more relaxed visual style.
-   `"balanced"`: A moderate, default spacing.

## Risks

-   **Flash of Unstyled Content (FOUC):** If client-side state (e.g., `densityMode`, `themeMode`) is applied *after* the initial server-rendered HTML, users may experience a brief flicker as styles change. Mitigation involves applying initial state (from server or sensible defaults) directly in the SSR output.
-   **Data Inconsistency:** While full persistence is a non-goal, relying solely on `localStorage` means state is not synchronized across devices or browser sessions. This is an accepted limitation for the current scope.
-   **Schema Migration Complexity:** As the dashboard evolves, managing migrations for `localStorage` schemas can become intricate. The `lifeos.dashboard.version` key is a first step, but the migration logic itself needs careful implementation.
-   **Performance Overhead:** Frequent reads/writes to `localStorage` or complex client-side state recalculations (e.g., on every `resize` event) could impact performance. Debouncing and throttling will be necessary.
-   **User Experience Discrepancies:** Without server-side persistence, a user's dashboard layout will not follow them across different browsers or devices, potentially leading to a fragmented experience.