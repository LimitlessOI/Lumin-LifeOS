## Dashboard Widget State Contract

### Goals
This contract defines the structure and behavior for client-side persistence of LifeOS Dashboard widget layout and display preferences. The primary goals are:
- To enable users to customize their dashboard experience by controlling widget visibility, order, density, and pinned status.
- To ensure these preferences persist across browser sessions using `localStorage` as the initial storage mechanism.
- To establish a clear, versioned schema for dashboard state, facilitating future migrations and server-side synchronization.
- To define clear boundaries for client-side rendering and server-side rendering (SSR) interactions.

### Keys & shapes

**Storage Key:** `lifeos_dashboard_layout_v1`

**Shape:**
The stored value will be a JSON string representing an object with the following structure:

```json
{
  "version": "1.0.0",
  "widgets": [
    {
      "id": "mit",
      "visible": true,
      "pinned": false
    },
    {
      "id": "score",
      "visible": true,
      "pinned": false
    },
    {
      "id": "lumin-quick",
      "visible": true,
      "pinned": false
    },
    {
      "id": "category-stubs",
      "visible": true,
      "pinned": false
    },
    {
      "id": "calendar",
      "visible": true,
      "pinned": false
    },
    {
      "id": "goals",
      "visible": true,
      "pinned": false
    },
    {
      "id": "chat",
      "visible": true,
      "pinned": false
    }
    // ... other widget configurations
  ],
  "order": [
    "mit",
    "calendar",
    "lumin-quick",
    "score",
    "goals",
    "chat",
    "category-stubs"
    // ... ordered list of all widget IDs
  ],
  "density": "STANDARD"
}
```

**Field Definitions:**
- `version` (string): Semantic version of the schema. Used for migration logic.
- `widgets` (array of objects): An array where each object represents a widget's individual settings.
  - `id` (string): Unique identifier for the widget (e.g., `mit`, `score`, `calendar`).
  - `visible` (boolean): `true` if the widget should be displayed, `false` otherwise.
  - `pinned` (boolean): `true` if the widget should be fixed in its position, `false` otherwise. Pinned widgets may have special rendering rules (e.g., always at the top).
- `order` (array of strings): An ordered list of all widget `id`s. This determines the visual sequence of widgets on the dashboard. Widgets not present in `order` but in `widgets` should be considered hidden or placed at the end.
- `density` (string): The current display density mode for the dashboard.

### Density enum
The `density` field will accept one of the following string values:
- `COMPACT`: Minimal spacing, more information visible at once.
- `STANDARD`: Default spacing, balanced information density.
- `SPACIOUS`: Increased spacing, larger elements, less information visible.

### Risks
-   **LocalStorage Limitations**: `localStorage` has a small storage limit (typically 5-10MB). While sufficient for dashboard layout, it's not suitable for large datasets.
-   **Data Volatility**: `localStorage` data is client-side and can be easily cleared by users (e.g., clearing browser cache/data), leading to loss of personalized settings.
-   **No Server Synchronization**: This contract defines local state only. There is no inherent mechanism for synchronizing settings across multiple devices or for backing up user preferences to a server. This will require a separate persistence API.
-   **Schema Migration Complexity**: As the dashboard evolves, the schema (`version`) may change. Implementing robust migration logic (e.g., from `v1` to `v2`) on the client-side can be complex and error-prone, requiring careful testing to avoid data loss or corrupted layouts.
-   **SSR/Client Boundary**: Initial server-side rendering will not have access to `localStorage` data. This can lead to a "flash of unstyled content" (FOUC) or layout shift as the client-side JavaScript hydrates the page and applies the user's saved preferences. A strategy for pre-fetching or default rendering is needed.