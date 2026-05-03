# Dashboard Local State Contract

This document defines the contract for client-side local storage of LifeOS Dashboard preferences, including widget visibility, order, density mode, and pinned widgets. This contract aims to standardize how these preferences are stored and retrieved, facilitating future server-side synchronization and schema evolution.

## Goals

*   **Standardize Client-Side State Management**: Establish a clear, consistent contract for storing user-specific dashboard preferences locally using `localStorage`.
*   **Support Dynamic Layouts**: Enable persistence for user-configured widget visibility, display order, and visual density mode to provide a personalized user experience across sessions.
*   **Facilitate Future Server-Side Sync**: Design the local storage schema to be compatible with a future server-side persistence layer, minimizing migration effort when transitioning to a centralized state management system.
*   **Ensure Data Integrity and Evolution**: Include a versioning mechanism to manage schema changes gracefully and provide a clear path for data migration, preventing data corruption or loss of user preferences.
*   **Define Client/SSR Boundaries**: Clearly delineate which state is managed purely client-side and which might eventually be managed server-side, acknowledging the current client-rendered nature of the dashboard.

## Keys & shapes

All dashboard-related local state will be consolidated under a single `localStorage` key, `lifeos_dashboard_state`, to minimize `localStorage` overhead and simplify versioning and retrieval. The value stored will be a JSON string representing the following structure:

*   **`localStorage` Key**: `lifeos_dashboard_state`
*   **JSON Shape**:
    ```json
    {
      "version": 1,
      "widgetVisibility": {
        "mit": true,
        "calendar": true,
        "goals": true,
        "scores": true,
        "chat": true
        // Add other widget IDs as boolean visibility flags (e.g., "ai-rail": true)
      },
      "widgetOrder": [
        "mit",
        "calendar",
        "goals",
        "scores",
        "chat"
        // Ordered array of widget IDs, defining their display sequence
      ],
      "densityMode": "balanced", // See Density enum below
      "pinnedWidgets": [
        // "ai-rail" // Example: if the AI rail becomes a pinnable widget
        // Array of widget IDs that are explicitly pinned by the user
      ]
    }
    ```

## Density enum

The `densityMode` property within the `lifeos_dashboard_state` object will accept one of the following string values, corresponding to distinct visual density levels:

*   `"compact"`: Represents a layout with minimal spacing, optimized for higher information density.
*   `"balanced"`: Represents the default layout with moderate spacing, offering a good balance between information and readability.
*   `"airy"`: Represents a layout with increased spacing, providing more visual breathing room and larger elements.

## Risks

*   **Schema Migration**: Any changes to the `lifeos_dashboard_state` schema (e.g., adding new properties, changing data types, renaming keys) will necessitate a migration strategy. The `version` field is included to facilitate this, but explicit client-side migration logic (e.g., on `DOMContentLoaded`) will be required to handle older schema versions gracefully. Failure to implement robust migration could lead to corrupted or reset user preferences.
*   **`localStorage` Size Limits**: While the defined state is relatively small, excessive data stored in `localStorage` can hit browser-imposed limits (typically 5-10MB). Keeping the state compact and avoiding large, unnecessary data is crucial.
*   **Client-Side vs. Server-Side Conflict**: Upon the introduction of server-side persistence for dashboard state, a clear strategy for resolving conflicts between local and server state will be essential (e.g., "last write wins", explicit sync mechanism, server-authoritative). The initial implementation should treat client-side state as authoritative until server synchronization is fully established.
*   **Performance on Load**: Reading and parsing the JSON string from `localStorage` on every page load introduces a minor overhead. For the current scope, this is expected to be negligible but warrants monitoring if the state grows significantly.
*   **SSR Boundary**: This contract is designed for client-side state management. For Server-Side Rendering (SSR), initial dashboard state would need to be either injected into the HTML or fetched asynchronously after hydration. Without careful handling, this could lead to a "flash of unstyled content" or layout shifts. The current `lifeos-dashboard.html` is primarily client-rendered, making this a future consideration.
*   **Data Integrity**: Malformed JSON in `localStorage` (e.g., due to manual user edits, browser extensions, or application bugs) could cause runtime errors during parsing. Robust parsing with `try...catch` blocks and sensible default fallbacks will be necessary to prevent application crashes.