**Goals**
This contract defines the client-side state management for the LifeOS Dashboard layout, enabling user customization and persistence across sessions. It aims to:
-   **Persist User Preferences**: Store user-defined widget visibility, order, and preferred density mode.
-   **Support Layout Customization**: Provide a clear structure for dynamic arrangement and display of dashboard widgets.
-   **Enable Future Features**: Lay the groundwork for advanced layout features such as widget pinning and server-side synchronization.
-   **Ensure Schema Evolution**: Incorporate versioning to facilitate future schema changes and data migrations without breaking existing user preferences.
-   **Define Client Boundaries**: Clearly delineate how layout state is managed on the client, acknowledging future server-side persistence.

**Keys & shapes**

The dashboard layout state will be stored as a single JSON object in `localStorage` under a versioned key.

-   **Primary Storage Key**: `lifeos_dashboard_layout_v1`
    -   Rationale: Uses `v1` to indicate the schema version, allowing for future migrations.
-   **Shape**: A JSON object with the following structure:

```json
{
  "version": 1,
  "density": "balanced",
  "widgets": [
    { "id": "mits", "visible": true, "pinned": false },
    { "id": "calendar", "visible": true, "pinned": false },
    { "id": "goals", "visible": true, "pinned": false },
    { "id": "scores", "visible": true, "pinned": false },
    { "id": "chat", "visible": true, "pinned": false },
    { "id": "ai-rail", "visible": true, "pinned": false }
  ]
}
```

-   **`version` (number)**:
    -   Current schema version. Incremented on breaking changes to trigger migration logic.
    -   Default: `1`
-   **`density` (string)**:
    -   The user's preferred dashboard density. This value can override the automatically detected density.
    -   Refer to "Density enum" section for allowed values.
    -   Default: `balanced`
-   **`widgets` (array of objects)**:
    -   An ordered array defining the presence, order, and state of each dashboard widget.
    -   If a widget `id` is not present in this array, it is considered hidden by default.
    -   **Widget Object Shape**:
        -   `id` (string): Unique identifier for the widget.
            -   Allowed values: `mits`, `calendar`, `goals`, `scores`, `chat`, `ai-rail`.
        -   `visible` (boolean): `true` if the widget should be displayed, `false` otherwise.
            -   Default: `true`
        -   `pinned` (boolean): `true` if the widget is pinned (e.g., fixed position, always visible), `false` otherwise.
            -   Default: `false`
-   **SSR/Client Boundaries**:
    -   Currently, the dashboard is client-rendered. The initial state will be loaded from `localStorage` on `DOMContentLoaded`.
    -   For future SSR integration, the server would ideally hydrate the initial state based on user preferences (potentially from a database) and embed it in the HTML, with client-side JavaScript then synchronizing with `localStorage` or updating it.

**Density enum**

The `density` field in the layout state object accepts one of the following string values:

-   `compact`: Maximizes information density, suitable for smaller screens or users preferring more content at a glance.
-   `balanced`: A moderate density, providing a good balance between content and whitespace. This is the default.
-   `airy`: Prioritizes whitespace and larger elements, suitable for larger displays or users preferring a less cluttered interface.

These values align with the `pickDashboardDensity` utility described in `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`.

**Risks**

-   **Schema Mismatch & Migration**: Without robust migration logic, changes to the `lifeos_dashboard_layout_v1` schema (e.g., adding new fields, changing types) could lead to errors or loss of user preferences if an older version is loaded.
    -   Mitigation: Implement explicit migration functions for each schema version bump.
-   **`localStorage` Limits**: While unlikely for layout preferences, `localStorage` has size limitations (typically 5-10MB). Storing excessively complex or large state objects could lead to storage failures.
    -   Mitigation: Keep the layout state object lean and focused on core preferences.
-   **Client-Side Only Persistence**: Relying solely on `localStorage` means user preferences are tied to a specific browser and device. If a user switches devices or clears browser data, their preferences are lost.
    -   Mitigation: Acknowledge this as a temporary solution, with a clear path to server-side persistence for cross-device synchronization.
-   **Default State Handling**: If `localStorage` is empty, corrupted, or inaccessible, the application must gracefully fall back to a sensible default layout to ensure a functional user experience.
    -   Mitigation: Define a clear default state object that the application can use.
-   **Race Conditions**: If multiple tabs or windows are open, concurrent updates to `localStorage` could lead to inconsistent state.
    -   Mitigation: Implement `storage` event listeners to synchronize state across tabs, or use a more robust state management solution if this becomes a significant issue.