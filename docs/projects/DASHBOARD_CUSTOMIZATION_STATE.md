# LifeOS Dashboard Local State Contract

This document defines the contract for managing the local state of the LifeOS Dashboard, specifically concerning widget visibility, order, density mode, and pinned widgets. This contract primarily focuses on client-side storage with a view towards future server-side persistence.

## Goals

*   **Personalization:** Allow users to customize their dashboard layout (which widgets are visible, their order, and display density).
*   **Persistence:** Ensure user preferences persist across browser sessions.
*   **Consistency:** Provide a clear, versioned schema for dashboard state to enable future evolution and migration.
*   **Performance:** Define a structure that is efficient for client-side storage and retrieval.

## Keys & Shapes

The dashboard state will be stored as a single JSON object in `localStorage` under a dedicated key.

**Storage Key:** `lifeos_dashboard_layout`

**Schema Shape:**

```typescript
interface DashboardLayoutState {
  version: number; // Schema version for migration
  density: DashboardDensity; // Display density mode
  widgetOrder: string[]; // Array of widget IDs in display order
  widgetVisibility: { [widgetId: string]: boolean }; // Map of widgetId to visibility status
  pinnedWidgets: string[]; // Array of widget IDs that are pinned (always at top, fixed position, etc.)
}
```

**Example Widget IDs (derived from `public/overlay/lifeos-dashboard.html`):**

*   `mits-list` (Today's MITs)
*   `cal-list` (Today's Schedule)
*   `goals-list` (Goals)
*   `scores-grid` (Life Scores)
*   `chat-card` (Chat with Lumin - assuming the chat section will be treated as a single widget)

**Initial State / Defaults:**

If `lifeos_dashboard_layout` is not found or is invalid, the dashboard will revert to a predefined default layout.

**Versioning & Migration:**

*   The `version` field will be an integer, starting at `1`.
*   On application boot, the stored `version` will be checked against the current application's expected schema version.
*   If the stored version is older, a migration function will be invoked to transform the old schema to the new one.
*   If migration fails or the version is missing/unrecognized, the state will be reset to defaults.

**SSR/Client Boundaries:**

*   This contract primarily defines client-side state management using `localStorage`.
*   For Server-Side Rendering (SSR), the initial dashboard layout would typically be rendered based on server-side defaults or a user's profile preferences if a server-side persistence layer is introduced later.
*   Client-side JavaScript will then hydrate the UI and apply any `localStorage` overrides.

## Density Enum

The `density` field will use the following string literal union:

```typescript
type DashboardDensity = 'compact' | 'comfortable' | 'spacious';