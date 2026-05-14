# Dashboard Widget State Contract

This document outlines the contract for managing the local state of dashboard widgets, covering visibility, order, density mode, and pinned status. It defines the structure and keys for client-side storage, with considerations for future server-side persistence, versioning, and SSR/client boundaries.

## Goals

1.  **Define State Structure:** Establish clear data shapes for widget visibility, display order, density, and pinned status.
2.  **Specify Storage Keys:** Identify unique keys for storing this state, initially in `localStorage`.
3.  **Enable Versioning:** Provide a mechanism for schema versioning to support future migrations.
4.  **Address SSR/Client:** Outline considerations for how this state interacts with Server-Side Rendering and client-side hydration.
5.  **Support Dynamic Layout:** Allow users to customize their dashboard experience through these state parameters.

## Keys & Shapes

All keys will be prefixed with `lifeos_dashboard_` to ensure namespace isolation.

### 1. Widget Visibility

*   **Purpose:** Determines which widgets are currently displayed on the dashboard.
*   **Storage Key:** `lifeos_dashboard_widget_visibility`
*   **Shape:** An object where keys are widget identifiers (strings) and values are booleans indicating visibility (`true` for visible, `false` for hidden).
*   **Example:**
    ```json
    {
      "lifeos-widget-mit": true,
      "lifeos-widget-score": true,
      "lifeos-widget-lumin-quick": false,
      "lifeos-widget-category-stubs": true,
      "mits-list": true,
      "cal-list": true,
      "goals-list": true,
      "scores-grid": true,
      "chat-messages": true
    }
    ```

### 2. Widget Order

*   **Purpose:** Defines the sequential display order of widgets on the dashboard.
*   **Storage Key:** `lifeos_dashboard_widget_order`
*   **Shape:** An array of widget identifiers (strings). The order of elements in the array dictates the display order. Widgets not present in this array will default to a predefined order or be appended.
*   **Example:**
    ```json
    [
      "lifeos-widget-mit",
      "lifeos-widget-score",
      "mits-list",
      "cal-list",
      "lifeos-widget-lumin-quick",
      "goals-list",
      "scores-grid",
      "lifeos-widget-category-stubs",
      "chat-messages"
    ]
    ```

### 3. Density Mode

*   **Purpose:** Controls the visual density (spacing, padding, font sizes) of widgets and the overall dashboard layout.
*   **Storage Key:** `lifeos_dashboard_density_mode`
*   **Shape:** A string representing one of the defined `DensityMode` enum values.
*   **Example:** `"STANDARD"`

### 4. Pinned Widgets

*   **Purpose:** Identifies widgets that should remain in a fixed position or be prioritized, regardless of general ordering rules.
*   **Storage Key:** `lifeos_dashboard_pinned_widgets`
*   **Shape:** An array of widget identifiers (strings).
*   **Example:**
    ```json
    [
      "lifeos-widget-mit",
      "chat-messages"
    ]
    ```

### 5. State Version

*   **Purpose:** Tracks the schema version of the stored dashboard state to facilitate migrations.
*   **Storage Key:** `lifeos_dashboard_state_version`
*   **Shape:** A number representing the current schema version.
*   **Example:** `1`

## Density Enum

The `DensityMode` enum defines the available display density settings for the dashboard.

*   `COMPACT`: Minimal spacing, smaller fonts, maximizing information density.
*   `STANDARD`: Default spacing and font sizes, balanced information and readability.
*   `SPACIOUS`: Increased spacing, larger fonts, prioritizing readability and visual comfort.

## Risks

1.  **Schema Migration Complexity:** As the dashboard evolves, changes to the state shapes (e.g., adding new properties, renaming keys) will require robust migration logic to prevent breaking existing user layouts. Failure to implement this carefully could lead to data loss or unexpected UI behavior for returning users.
2.  **LocalStorage Limitations:** While suitable for initial client-side state, `localStorage` has size limits and does not roam across devices. A future server-side persistence layer will be necessary for a complete solution, introducing potential synchronization challenges.
3.  **SSR/Client Hydration Mismatch:** If the initial server-rendered HTML does not reflect the user's saved `localStorage` state, a "flash of unstyled content" (FOUC) or layout shift may occur as the client-side JavaScript applies the user's preferences. This requires careful handling to ensure a smooth user experience.
4.  **Performance Overhead:** Frequent reads/writes to `localStorage` on every page load or state change could introduce minor performance overhead, though for typical dashboard layout changes, this is generally negligible.
5.  **Widget ID Stability:** The contract relies on stable and unique widget identifiers. Any changes to these IDs without corresponding migration logic will break user preferences for those widgets.