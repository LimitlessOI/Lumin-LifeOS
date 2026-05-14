## Dashboard State Contract

This document defines the client-side contract for persisting user preferences related to the LifeOS Dashboard layout and display. These preferences are initially stored in `localStorage` and are designed to be compatible with future server-side persistence.

### Goals

- Define a clear, versioned schema for dashboard layout preferences.
- Enable user customization of widget visibility, order, density, and pinning.
- Establish a foundation for seamless migration of user preferences across schema updates.
- Outline the interaction between client-side storage (`localStorage`) and potential future server-side persistence, ensuring client-side hydration.

### Keys & Shapes

All keys will be prefixed with `lifeos_dashboard_` to prevent collisions.

| Preference | `localStorage` Key | Shape | Description | Example |
|---|---|---|---|---|
| **Schema Version** | `lifeos_dashboard_state_version` | `number` | Incremental version of the dashboard state schema. Used for migration. | `1` |
| **Widget Visibility** | `lifeos_dashboard_widget_visibility` | `{ [widgetId: string]: boolean }` | A map indicating whether a widget is visible (`true`) or hidden (`false`). | `{ "lifeos-widget-mit": true, "lifeos-widget-score": false }` |
| **Widget Order** | `lifeos_dashboard_widget_order` | `string[]` | An ordered array of widget IDs, defining their display sequence. | `["lifeos-widget-mit", "lifeos-widget-lumin-quick", "lifeos-widget-score", "lifeos-widget-category-stubs"]` |
| **Density Mode** | `lifeos_dashboard_density_mode` | `DensityEnum` | The preferred display density for widgets. | `"compact"` |
| **Pinned Widgets** | `lifeos_dashboard_pinned_widgets` | `string[]` | An array of widget IDs that are "pinned" to a specific position or state. | `["lifeos-widget-mit"]` |

### Density Enum

The `DensityEnum` defines the available display density modes for the dashboard.

```typescript
type DensityEnum = 'comfortable' | 'compact' | 'minimal';
```

- **`comfortable`**: Default, spacious layout.
- **`compact`**: Reduced padding and spacing for more information density.
- **`minimal`**: Highly condensed, potentially hiding non-essential elements.

### Risks

- **Schema Drift:** Without a robust versioning and migration strategy, changes to the state contract could lead to broken user experiences or loss of preferences.
- **`localStorage` Limitations:** `localStorage` is synchronous and has a limited storage capacity (typically 5-10MB). While sufficient for preferences, it's not suitable for large datasets.
- **SSR/Client Hydration Mismatch:** If server-side rendering (SSR) is introduced, a mismatch between the initial server-rendered state and the client-hydrated state (from `localStorage`) could cause a "flash of unstyled content" or layout shifts.
- **Data Integrity:** Malicious client-side scripts could tamper with `localStorage` values, leading to unexpected UI behavior.
- **Future Server-Side Sync:** Transitioning from `localStorage` to server-side persistence will require careful synchronization logic to merge or prioritize preferences.