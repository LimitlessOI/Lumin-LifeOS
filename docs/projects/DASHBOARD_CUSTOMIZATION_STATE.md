## Goals

This contract defines the structure and management principles for client-side dashboard state, enabling user customization and preparing for future server-side persistence.

1.  **Establish a Clear Schema:** Define a versioned, predictable schema for storing user preferences related to dashboard layout and widget configuration.
2.  **Enable User Customization:** Support user-driven changes to widget visibility, display order, pinning status, and overall dashboard density.
3.  **Plan for Persistence:** Outline the transition from client-side `localStorage` to a server-side user preferences API.
4.  **Ensure Data Integrity:** Provide mechanisms for schema versioning and migration to prevent data loss or corruption on updates.
5.  **Manage Rendering Boundaries:** Address how this state interacts with Server-Side Rendering (SSR) and client-side hydration.

## Keys & shapes

The dashboard state will be stored as a single JSON object under a root key.

-   **Root Key (Client-side):** `lifeos_dashboard_state`
-   **Shape:**

    ```json
    {
      "version": "1.0.0",
      "widgets": {
        "visibility": {
          "lifeos-widget-mit": true,
          "lifeos-widget-score": true,
          "lifeos-widget-lumin-quick": true,
          "lifeos-widget-category-stubs": true
          // ... additional widget IDs, boolean indicates visible (true) or hidden (false)
        },
        "order": [
          "lifeos-widget-mit",
          "lifeos-widget-score",
          "lifeos-widget-lumin-quick",
          "lifeos-widget-category-stubs"
          // ... ordered array of all widget IDs, regardless of visibility.
          // Widgets not in 'visibility' or set to false will not render.
        ],
        "pinned": [
          // Array of widget IDs that are "pinned" to a specific, non-reorderable position.
          // Pinned widgets should appear at the beginning of the 'order' array.
        ]
      },
      "layout": {
        "density": "balanced" // See Density Enum
      }
    }
    ```

-   **Storage Location:**
    -   **Client-side (initial):** `localStorage` (key: `lifeos_dashboard_state`).
    -   **Server-side (future):** User preferences API endpoint (e.g., `/api/v1/user/preferences/dashboard`). The client will fetch this state on boot and persist changes back to the server.

## Density enum

The `layout.density` field will use one of the following string values:

-   `"compact"`: Optimized for high information density, minimal spacing, and smaller element sizes.
-   `"balanced"`: The default density, offering a moderate balance between information density and readability.
-   `"airy"`: Prioritizes readability and larger touch targets, with increased spacing and element sizes.

## Risks

1.  **Schema Drift & Migration:** Changes to the state schema (`version` bump) without a robust client-side migration strategy can lead to broken layouts or lost preferences for existing users. A clear migration function (e.g., `migrateDashboardState(oldState)`) will be required.
2.  **`localStorage` Performance/Limits:** Storing large or frequently updated state in `localStorage` can impact client-side performance and potentially hit browser storage limits. This contract assumes the dashboard state remains relatively compact.
3.  **Client-Server Desynchronization:** Once server-side persistence is introduced, ensuring the client-side state is consistently synchronized with the server will be critical. Conflicts or stale data could lead to a poor user experience.
4.  **Hydration Mismatch:** If SSR renders a default dashboard layout and the client-side state from `localStorage` (or server API) is different, a "flash of unstyled content" (FOUC) or layout shift may occur during client-side hydration.
5.  **Widget ID Consistency:** Maintaining unique and consistent widget IDs across the platform is paramount. Any mismatch between the stored IDs and available widgets will result in rendering errors or missing content.