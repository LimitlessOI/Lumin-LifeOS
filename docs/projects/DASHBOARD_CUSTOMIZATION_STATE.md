## Dashboard Layout State Contract

This document defines the contract for storing and managing the local state of the LifeOS Dashboard layout, including widget visibility, order, density mode, and pinned widgets. This contract primarily targets client-side `localStorage` for initial implementation, with a clear path for future server-side persistence.

### Goals
- Establish a clear, versioned schema for dashboard layout preferences.
- Enable user customization of widget visibility and display order.
- Support dynamic adjustment of dashboard density based on user preference or viewport.
- Provide a mechanism for "pinning" specific widgets for persistent display.
- Define client-side storage keys and data shapes.
- Outline considerations for SSR and client-side hydration.

### Keys & shapes

**Storage Location:** Initially `localStorage`. Future iterations will integrate with a server-side user settings API for cross-device persistence.

**Schema Versioning:**
- **Key:** `lifeos_dashboard_schema_version`
- **Shape:** `number`
- **Purpose:** To manage migrations of stored layout preferences. If the stored version is older than the current application version, client-side migration logic will apply defaults or transform existing data to the new schema.
- **Current Version:** `1`

**Widget Visibility:**
- **Key:** `lifeos_dashboard_widget_visibility`
- **Shape:** `Record<string, boolean>`
    - Example: `{ "mits": true, "calendar": true, "goals": false, "scores": true, "chat": true }`
- **Default:** All widgets visible (`true`).
- **Widget IDs (current):** `mits`, `calendar`, `goals`, `scores`, `chat`. These correspond to the main content cards in `lifeos-dashboard.html`.

**Widget Order:**
- **Key:** `lifeos_dashboard_widget_order`
- **Shape:** `string[]`
    - Example: `["chat", "mits", "scores", "calendar", "goals"]`
- **Default:** `["mits", "calendar", "goals", "scores", "chat"]` (reflecting the current hardcoded order in `lifeos-dashboard.html`).
- **Purpose:** Allows users to re-arrange the primary dashboard sections.

**Dashboard Density Mode:**
- **Key:** `lifeos_dashboard_density_mode`
- **Shape:** `DensityMode` enum value (string).
- **Default:** `null` or `undefined`. When not explicitly set by the user, the `pickDashboardDensity` utility function will determine the optimal density based on viewport characteristics. If a user explicitly selects a density, this value will override auto-detection.

**Pinned Widgets:**
- **Key:** `lifeos_dashboard_pinned_widgets`
- **Shape:** `string[]`
    - Example: `["chat"]` (if the chat widget is pinned to a persistent sidebar or footer).
- **Default:** `[]` (no widgets pinned).
- **Purpose:** For future UI components that allow users to "pin" widgets to fixed, always-visible positions, independent of the main scrollable flow.

### Density enum
The `DensityMode` enum defines the possible visual densities for the dashboard layout:
- `compact`: Minimal spacing, higher information density.
- `balanced`: Standard spacing, good balance of information and readability.
- `airy`: Generous spacing, lower information density, more relaxed feel.

### Risks
- **Schema Migration Complexity:** As the dashboard evolves, changes to the layout schema will require robust migration logic to ensure existing user preferences are preserved or gracefully reset, preventing data loss or unexpected UI behavior.
- **SSR/Client Hydration Discrepancy:** When server-side rendering is used, the initial HTML output will reflect a default layout. Client-side JavaScript will then read `localStorage` and apply user-specific preferences. This can lead to a brief "flash of unstyled content" (FOUC) or layout shift if the client's stored state significantly differs from the server-rendered default. This is an acceptable trade-off for initial client-side implementation; future server-side persistence would mitigate this by rendering the user's actual preferences directly.
- **Performance Overhead:** Frequent reads from `localStorage` or complex client-side layout recalculations on events like window resize could introduce minor performance overhead. Optimizations like debouncing resize handlers and caching `localStorage` values will be necessary.
- **Data Consistency with Server:** Once server-side persistence is introduced, ensuring seamless synchronization and conflict resolution between local `localStorage` and the server-side user profile will be critical to maintain a consistent user experience across devices.
- **Widget ID Management:** A consistent and immutable set of widget IDs is crucial. Introducing new widgets or changing existing IDs without a clear migration path could break user preferences.