The specification for dashboard card density modes is outlined below.

# Dashboard Card Density Specification

This document details the implementation plan for dashboard card density modes (Compact, Balanced, Expanded), including their mapping to CSS variables, DOM data attributes, mobile constraints, and integration with the customization state.

## 1. Density Modes

Three primary density modes will be supported for dashboard cards:

*   **Compact:** Optimized for displaying more information in a smaller area. Reduces padding, margins, and potentially font sizes.
*   **Balanced:** The default, standard density. Provides a good balance between information density and visual comfort.
*   **Expanded:** Prioritizes readability and visual separation. Increases padding, margins, and potentially font sizes.

## 2. CSS Variable Mapping

Density modes will be controlled by applying a `data-density` attribute to a high-level container (e.g., `<body>` or `#lifeos-dashboard-root`). This attribute will then drive specific CSS variable overrides, primarily affecting spacing and potentially font sizes.

The base `--dash-space-unit` (currently `8px`) will be used as a multiplier for density-specific variables.

**Proposed CSS Variables (to be defined within `public/shared/lifeos-dashboard-tokens.css` or a new `lifeos-dashboard-density-tokens.css`):**

```css
/* Base density variables, defaulting to Balanced */
:root {
  --dash-density-card-padding-x: calc(var(--dash-space-unit) * 2); /* 16px */
  --dash-density-card-padding-y: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --dash-density-card-gap: var(--dash-space-unit); /* 8px */
  --dash-density-font-size-sm: 0.875rem; /* 14px */
  --dash-density-font-size-md: 1rem; /* 16px */
  --dash-density-line-height-sm: 1.4;
  --dash-density-line-height-md: 1.5;
}

/* Compact Mode */
[data-density="compact"] {
  --dash-density-card-padding-x: var(--dash-space-unit); /* 8px */
  --dash-density-card-padding-y: calc(var(--dash-space-unit) * 0.75); /* 6px */
  --dash-density-card-gap: calc(var(--dash-space-unit) * 0.5); /* 4px */
  --dash-density-font-size-sm: 0.75rem; /* 12px */
  --dash-density-font-size-md: 0.875rem; /* 14px */
  --dash-density-line-height-sm: 1.3;
  --dash-density-line-height-md: 1.4;
}

/* Expanded Mode */
[data-density="expanded"] {
  --dash-density-card-padding-x: calc(var(--dash-space-unit) * 3); /* 24px */
  --dash-density-card-padding-y: calc(var(--dash-space-unit) * 2); /* 16px */
  --dash-density-card-gap: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --dash-density-font-size-sm: 0.9375rem; /* 15px */
  --dash-density-font-size-md: 1.125rem; /* 18px */
  --dash-density-line-height-sm: 1.5;
  --dash-density-line-height-md: 1.6;
}
```

Dashboard components will then consume these `--dash-density-*` variables for their internal spacing, padding, and typography.

## 3. DOM Data Attribute Integration

The selected density mode will be applied as a `data-density` attribute on the main dashboard container element (e.g., `<div id="lifeos-dashboard-root" data-density="balanced">`).

Example:
```html
<body data-theme="dark">
  <div id="lifeos-dashboard-root" data-density="compact">
    <!-- Dashboard content, cards, etc. -->
  </div>
</body>
```

JavaScript will be responsible for reading the user's preferred density from the customization state and applying this attribute on initial load and whenever the preference changes.

## 4. Mobile Constraints

On mobile viewports (e.g., screen width < 768px), the dashboard will enforce a default density to ensure optimal usability and layout.

*   **Default Mobile Density:** Mobile views will default to `compact` density, regardless of the user's desktop preference.
*   **User Override:** Users may be allowed to select `balanced` on mobile, but `expanded` will likely be disabled or automatically scaled down to `balanced` to prevent excessive scrolling and poor information density. This will be handled via CSS media queries overriding the `data-density` attribute or JavaScript logic preventing the application of `expanded` on small screens.

Example CSS for mobile override:
```css
@media (max-width: 767px) {
  #lifeos-dashboard-root,
  #lifeos-dashboard-root[data-density="expanded"] {
    /* Force compact or balanced on mobile */
    --dash-density-card-padding-x: var(--dash-space-unit);
    --dash-density-card-padding-y: calc(var(--dash-space-unit) * 0.75);
    --dash-density-card-gap: calc(var(--dash-space-unit) * 0.5);
    --dash-density-font-size-sm: 0.75rem;
    --dash-density-font-size-md: 0.875rem;
    --dash-density-line-height-sm: 1.3;
    --dash-density-line-height-md: 1.4;
  }
}
```

## 5. Customization State Intersection

The user's preferred dashboard density will be stored as part of the `DASHBOARD_CUSTOMIZATION_STATE`.

*   **State Key:** A new key, e.g., `dashboardDensity`, will be added to the customization state object.
*   **Value:** The value will be a string: `"compact"`, `"balanced"`, or `"expanded"`.
*   **Default:** If `dashboardDensity` is not present, it will default to `"balanced"`.
*   **Persistence:** This preference will be persisted across sessions (e.g., in `localStorage` or user profile settings).
*   **Application:** On dashboard load, the JavaScript responsible for applying user preferences will read `dashboardDensity` and set the `data-density` attribute on the root dashboard element.

Example Customization State (conceptual):
```json
{
  "theme": "dark",
  "dashboardLayout": "grid",
  "dashboardDensity": "balanced", // New key
  "cardVisibility": {
    "welcome": true,
    "tasks": true
  }
}
```

## 6. Rollout Order

1.  **Define CSS Variables:** Introduce the `--dash-density-*` variables and their overrides for `compact` and `expanded` modes in `public/shared/lifeos-dashboard-tokens.css` (or a new dedicated density CSS file).
2.  **Update Core Components:** Modify existing dashboard card components to consume the new `--dash-density-*` variables for their internal spacing and typography.
3.  **Implement Customization State:** Add `dashboardDensity` to the `DASHBOARD_CUSTOMIZATION_STATE` schema and implement logic to read/write this preference.
4.  **Apply Data Attribute:** Implement JavaScript to read the `dashboardDensity` from the customization state and apply the `data-density` attribute to the dashboard root element.
5.  **Mobile Overrides:** Implement CSS media queries to enforce mobile density constraints.
6.  **UI for Density Selection:** Develop a UI control (e.g., a dropdown or toggle buttons) within dashboard settings to allow users to change their preferred density.