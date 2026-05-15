# LifeOS Dashboard Local State Contract

## Goals
This document defines the contract for client-side local storage of LifeOS Dashboard user preferences. The primary goals are:
- To establish clear keys and data shapes for dashboard layout customization.
- To enable user control over widget visibility, order, density, and pinning.
- To provide a foundation for future server-side persistence and graceful schema evolution.
- To ensure all operations remain client-side, respecting SSR/client boundaries.

## Keys & shapes

All keys will be stored in `localStorage` initially, prefixed with `lifeos_dashboard_`.

### 1. Widget Visibility
- **Purpose:** Stores which widgets are visible or hidden by the user.
- **Key:** `lifeos_dashboard_widget_visibility`
- **Shape:** `Record<string, boolean>`
  - Example: `{"lifeos-widget-mit": true, "lifeos-widget-score": false, "lifeos-widget-lumin-quick": true}`
  - `string`: The HTML `id` attribute of the dashboard widget element (e.g., `lifeos-widget-mit`).
  - `boolean`: `true` if the widget is visible, `false` if hidden.
- **Default:** All widgets visible.

### 2. Widget Order
- **Purpose:** Stores the user-defined order of widgets.
- **Key:** `lifeos_dashboard_widget_order`
- **Shape:** `string[]`
  - Example: `["lifeos-widget-score", "lifeos-widget-mit", "lifeos-widget-category-stubs", "lifeos-widget-lumin-quick"]`
  - `string`: The HTML `id` attribute of the dashboard widget element.
  - The order of elements in the array dictates their display order.
- **Default:** The order as defined in `public/overlay/lifeos-dashboard.html`.

### 3. Density Mode
- **Purpose:** Stores the user's preferred dashboard density, overriding the auto-picked density.
- **Key:** `lifeos_dashboard_density_override`
- **Shape:** `DensityMode | null`
  - `DensityMode`: One of the values from the `DensityMode` enum below.
  - `null`: Indicates that the system should automatically determine the density using `pickDashboardDensity`.
- **Default:** `null` (auto-pick).

### 4. Pinned Widgets
- **Purpose:** Stores a list of widgets that the user has "pinned," implying a fixed position or always-visible status regardless of other layout rules.
- **Key:** `lifeos_dashboard_pinned_widgets`
- **Shape:** `string[]`
  - Example: `["lifeos-widget-mit"]`
  - `string`: The HTML `id` attribute of the dashboard widget element.
- **Default:** `[]` (no widgets pinned).

### 5. State Version
- **Purpose:** Tracks the schema version of the dashboard's local state to facilitate migrations.
- **Key:** `lifeos_dashboard_state_version`
- **Shape:** `number`
  - Example: `1`
- **Default:** `0` (or current version if not present).

## Density enum

The `DensityMode` enum defines the possible visual density settings for the dashboard. These values correspond to the outputs of the `pickDashboardDensity` utility.

```typescript
enum DensityMode {
  Compact = 'compact',
  Airy = 'airy',
  Balanced = 'balanced', // Default visual style
}