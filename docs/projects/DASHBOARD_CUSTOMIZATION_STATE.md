## Goals

This document defines the contract for client-side storage of user preferences related to the LifeOS Dashboard layout and presentation. The primary goals are:

- To establish a clear, versioned schema for persisting dashboard widget visibility, display order, density mode, and pinned status.
- To enable a consistent user experience across sessions by restoring preferred layouts.
- To provide a foundation for potential future server-side synchronization without implementing the full persistence API at this stage.
- To ensure forward compatibility through schema versioning for future data migrations.

## Keys & shapes

The dashboard settings will be stored in `localStorage` under a single key to minimize fragmentation and simplify access.

**Storage Mechanism:** `localStorage`

**Primary Key:** `lifeos_dashboard_layout`

**Data Shape (JSON object):**

```json
{
  "version": 1,
  "density": "comfortable",
  "widgetOrder": [
    "mits",
    "calendar",
    "goals",
    "scores",
    "chat"
  ],
  "widgetVisibility": {
    "mits": true,
    "calendar": true,
    "goals": true,
    "scores": true,
    "chat": true
  },
  "pinnedWidgets": []
}
```

**Field Definitions:**

-   `version` (Number): An integer representing the schema version of the stored data. Incremented on schema changes to facilitate migration.
-   `density` (String): The current display density mode for the dashboard. See "Density enum" section for allowed values.
-   `widgetOrder` (Array<String>): An ordered array of widget identifiers. The order in this array dictates the visual arrangement of widgets on the dashboard.
-   `widgetVisibility` (Object<String, Boolean>): A map where keys are widget identifiers and values are booleans indicating whether the widget is currently visible (`true`) or hidden (`false`).
-   `pinnedWidgets` (Array<String>): An array of widget identifiers that are designated as "pinned." The exact behavior of pinned widgets (e.g., always at the top, fixed position) is an implementation detail but their state is tracked here.

**Widget Identifiers (IDs):**

The following string identifiers are used for dashboard widgets:

-   `mits`: "Today's MITs" card
-   `calendar`: "Today's Schedule" card
-   `goals`: "Goals" card
-   `scores`: "Life Scores" card
-   `chat`: "Chat with Lumin" card

## Density enum

The `density` field in the `lifeos_dashboard_layout` object will adhere to the following string enum values:

-   `"comfortable"`: The default spacing and layout, as currently implemented.
-   `"compact"`: A mode with reduced padding, margins, and potentially smaller font sizes to fit more information on screen.
-   `"spacious"`: A mode with increased padding and margins for a more relaxed visual experience.

## Risks

-   **Client-Side Only Persistence:** Relying solely on `localStorage` means settings are not synchronized across devices or browser profiles. A future server-side persistence layer will be required for this.
-   **Schema Migration Complexity:** As the `version` number increases, the logic to migrate older data shapes to the current schema can become complex and error-prone. Thorough testing of migration paths is essential.
-   **SSR Mismatch:** During Server-Side Rendering (SSR), the initial HTML will not reflect `localStorage` preferences. This can lead to a "flash of unstyled content" or layout shift as the client-side JavaScript hydrates the page and applies the stored settings. Strategies like preloading state or using default values on SSR are needed.
-   **Performance Impact:** Frequent reads/writes to `localStorage` can introduce minor performance overhead. Updates should be debounced or batched where appropriate.
-   **Data Integrity:** `localStorage` can be cleared by the user or browser, leading to loss of preferences. The application must gracefully handle missing or corrupted data by falling back to default settings.