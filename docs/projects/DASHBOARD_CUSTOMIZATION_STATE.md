# Dashboard Local State Contract

This document defines the contract for managing the local state of the LifeOS Dashboard, specifically focusing on user preferences for widget visibility, order, density mode, and pinned status. This contract aims to provide a clear, versioned structure for client-side persistence, with consideration for future server-side synchronization and SSR compatibility.

## Goals

*   **Client-Side Persistence:** Enable users to retain their dashboard layout and display preferences across sessions using `localStorage`.
*   **Clear Schema:** Define explicit keys and data shapes for all persisted dashboard preferences.
*   **Versioning & Migration:** Support schema evolution with a mechanism for versioning and graceful migration or reset.
*   **SSR Compatibility:** Ensure the contract supports a smooth hydration process, minimizing client-side layout shifts.
*   **Future-Proofing:** Design the contract to be compatible with a future server-side persistence API.

## Keys & Shapes

All keys will be prefixed with `lifeos_dashboard_` to avoid collisions.

### Widget Visibility

*   **Key:** `lifeos_dashboard_widget_visibility`
*   **Storage:** `localStorage` (client-side), future server API.
*   **Shape:** `Record<string, boolean>`
    *   A JavaScript object where keys are unique widget identifiers (e.g., `lifeos-widget-mit`, `lifeos-widget-score`) and values are `boolean` indicating if the widget is visible (`true`) or hidden (`false`).
    *   **Example:** `{"lifeos-widget-mit": true, "lifeos-widget-score": false}`

### Widget Order

*   **Key:** `lifeos_dashboard_widget_order`
*   **Storage:** `localStorage` (client-side), future server API.
*   **Shape:** `string[]`
    *   A JavaScript array of unique widget identifiers, representing the desired display order. The order in the array dictates the rendering order.
    *   **Example:** `["lifeos-widget-score", "lifeos-widget-mit", "lifeos-widget-lumin-quick"]`

### Density Mode

*   **Key:** `lifeos_dashboard_density_mode`
*   **Storage:** `localStorage` (client-side), future server API.
*   **Shape:** `string` (from `DensityMode` enum)
    *   A string representing the user's preferred display density for widgets.
    *   **Example:** `"comfortable"`

### Pinned Widgets

*   **Key:** `lifeos_dashboard_pinned_widgets`
*   **Storage:** `localStorage` (client-side), future server API.
*   **Shape:** `string[]`
    *   A JavaScript array of unique widget identifiers that the user has chosen to "pin." Pinned widgets typically appear at the top or in a fixed section, regardless of the general order.
    *   **Example:** `["lifeos-widget-mit"]`

### State Version

*   **Key:** `lifeos_dashboard_state_version`
*   **Storage:** `localStorage` (client-side), future server API.
*   **Shape:** `number`
    *   An integer representing the schema version of the stored dashboard state. This allows for future migrations.
    *   **Current Version:** `1`

## Density Enum

The `DensityMode` enum defines the available display density settings for the dashboard widgets.

*   **`compact`**: Minimal spacing, smaller fonts, more information visible at once.
*   **`comfortable`**: Default spacing, balanced information density.
*   **`spacious`**: Increased spacing, larger elements, less information visible.

## Risks

*   **Schema Mismatch:** If a user's `localStorage` contains an older schema version, the application must gracefully handle it (e.g., migrate, reset to default, or log an error).
*   **Data Corruption:** Malformed or invalid data in `localStorage` could lead to rendering issues or application crashes. Robust parsing and validation are required.
*   **Performance Overhead:** Storing excessively large or frequently updated state in `localStorage` can impact client-side performance. This contract focuses on small, preference-based data.
*   **SSR Hydration Mismatch:** If the server renders a default layout and the client immediately applies a different `localStorage` layout, a visible "flicker" or layout shift can occur. Strategies like pre-fetching state on the server or applying client state after initial render are needed.
*   **Security (Low):** While dashboard preferences are generally not sensitive, `localStorage` is client-side and can be manipulated. No sensitive user data should be stored here.
*   **Concurrency:** Multiple browser tabs/windows accessing and modifying `localStorage` simultaneously could lead to race conditions and inconsistent state.