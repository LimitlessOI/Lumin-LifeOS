# LifeOS Dashboard State Contract

## Goals
- Define a standardized contract for storing user-specific dashboard preferences.
- Enable persistence of widget visibility, display order, density mode, and pinned status.
- Establish a clear path for future migration from client-side `localStorage` to server-side persistence.
- Ensure compatibility with both client-side rendering (CSR) and future server-side rendering (SSR) scenarios.

## Keys & shapes
- **Storage Mechanism:** Initially `localStorage`. Future state will be persisted server-side.
- **Versioning:** A schema version will be stored to facilitate future migrations.
  - **Key:** `lifeos_dashboard_schema_version`
  - **Shape:** `number` (e.g., `1`)
- **Widget Visibility:** Controls which widgets are displayed.
  - **Key:** `lifeos_dashboard_widget_visibility`
  - **Shape:** `Record<string, boolean>` (JSON stringified)
    - Example: `{ "mits": true, "calendar": true, "goals": false, "scores": true, "chat": true }`
- **Widget Order:** Defines the display sequence of widgets.
  - **Key:** `lifeos_dashboard_widget_order`
  - **Shape:** `string[]` (JSON stringified)
    - Example: `["mits", "calendar", "chat", "scores", "goals"]`
- **Density Mode:** Adjusts the visual density of dashboard elements.
  - **Key:** `lifeos_dashboard_density_mode`
  - **Shape:** `DensityMode` (JSON stringified enum value)
    - Example: `"COMPACT"`
- **Pinned Widgets:** Identifies widgets that are "pinned" to a specific location or state.
  - **Key:** `lifeos_dashboard_pinned_widgets`
  - **Shape:** `string[]` (JSON stringified)
    - Example: `["mits"]`

## Density enum
```typescript
enum DensityMode {
  COMPACT = "COMPACT",
  COMFORTABLE = "COMFORTABLE",
  SPACIOUS = "SPACIOUS",
}
```
- `COMPACT`: Minimal spacing, higher information density.
- `COMFORTABLE`: Default spacing, balanced readability.
- `SPACIOUS`: Increased spacing, larger elements, lower information density.

## Risks
- **Schema Migration:** Changes to the state contract (e.g., new keys, altered shapes) will require migration logic to prevent data loss or corruption for existing users. This must be handled carefully on schema version bumps.
- **LocalStorage Limitations:** `localStorage` is synchronous, has limited storage capacity (typically 5-10MB), and is domain-specific. It is not suitable for large or sensitive data.
- **SSR/Client Hydration:** When transitioning to SSR, initial state must be correctly injected and hydrated on the client to avoid UI flashes or re-renders due to state mismatches.
- **Data Consistency (Future Server Sync):** Once server-side persistence is introduced, mechanisms for synchronizing local and server state, including conflict resolution, will be necessary.
- **Performance:** Excessive or complex operations on `localStorage` can introduce jank, especially during page load or frequent state updates.
- **Widget ID Stability:** Widget IDs used in `visibility`, `order`, and `pinned` arrays must be stable and unique across the application lifecycle to ensure reliable persistence.