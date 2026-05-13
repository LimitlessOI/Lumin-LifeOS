## Goals
- Define a standardized structure for client-side dashboard state.
- Support user customization of widget visibility, order, and pinning.
- Implement adaptive density mode based on user preference and viewport.
- Establish a clear path for state versioning and migration.
- Prepare for eventual server-side persistence.

## Keys & shapes
The dashboard state will be stored as a single JSON object under a `localStorage` key.

**Key**: `lifeos_dashboard_state`

**Shape**:
```json
{
  "version": "1.0.0",
  "widgets": {
    "order": [
      "lifeos-widget-mit",
      "lifeos-widget-score",
      "lifeos-widget-lumin-quick",
      "lifeos-widget-category-stubs"
    ],
    "visibility": {
      "lifeos-widget-mit": true,
      "lifeos-widget-score": true,
      "lifeos-widget-lumin-quick": true,
      "lifeos-widget-category-stubs": true
    },
    "pinned": []
  },
  "density": "balanced"
}
```
- `version`: (string) Semantic version of the state schema.
- `widgets.order`: (string[]) An ordered array of widget IDs, reflecting the user's preferred layout. Default order matches `lifeos-dashboard.html`.
- `widgets.visibility`: (Record<string, boolean>) A map where keys are widget IDs and values are `true` if the widget is visible, `false` if hidden. All widgets are visible by default.
- `widgets.pinned`: (string[]) An array of widget IDs that are "pinned" to a specific location or state, overriding dynamic layout.
- `density`: (string) The user's preferred or system-determined dashboard density. See "Density enum" section.

## Density enum
The `density` field will accept one of the following string values:
- `compact`: Optimized for high information density, smaller elements, less spacing.
- `balanced`: A default, moderate density.
- `airy`: Optimized for readability and larger touch targets, more spacing.

## Versioning & Migration
- The `version` field in the stored JSON object will be used to manage schema changes.
- On application boot, the stored state's `version` will be compared against the current application's expected version.
- If the stored version is older or missing, a migration function will be invoked.
- Migration logic will involve:
    - Applying default values for newly introduced fields.
    - Transforming data structures from older schemas to the current one.
    - Example: If `widgets.order` is missing, it will be initialized with the default widget order from the HTML. If `widgets.visibility` is missing, all widgets will be set to `true`.

## SSR/Client Boundaries
- This contract defines client-side state only.
- All state management (loading, saving, applying) will occur within client-side JavaScript.
- State will be loaded from `localStorage` on `DOMContentLoaded` and applied to the DOM.
- No server-side rendering of this dynamic, user-specific dashboard layout state is planned.
- The `public/overlay/lifeos-dashboard.html` is served statically, and client-side scripts hydrate the dynamic elements.

## Risks
- **`localStorage` limitations**: While generally sufficient for this scope, excessive data could impact performance or hit storage limits.
- **Data corruption**: `localStorage` is not robust against manual user tampering or browser issues, potentially leading to unexpected dashboard layouts.
- **Migration complexity**: As the schema evolves, migration logic can become intricate, requiring careful testing.
- **Lack of server-side sync**: Without server-side persistence, user preferences are tied to a single device/browser, leading to inconsistent experiences across different access points. This is a known limitation for the current phase.