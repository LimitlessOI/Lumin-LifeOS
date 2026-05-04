# Dashboard Card Density Specification

This document outlines the specification for implementing configurable density modes for dashboard cards within the LifeOS platform. These modes allow users to adjust the visual information density of their dashboard, catering to different preferences and screen sizes.

## 1. Overview

Dashboard card density refers to the amount of spacing, padding, and font sizing applied to elements within a dashboard card. This specification defines three distinct density modes: `compact`, `balanced`, and `expanded`. These modes will be controlled via a `data-density` attribute on a root dashboard container, which will then cascade CSS variable adjustments to individual cards.

## 2. Density Modes

### 2.1. `balanced` (Default)
This is the standard, default density mode. It provides a comfortable visual balance between information display and whitespace, suitable for most users and typical screen sizes.

### 2.2. `compact`
The `compact` mode reduces spacing, padding, and potentially font sizes to display more information within the same screen area. This mode is ideal for users who prefer a denser information display or for smaller screens where maximizing content visibility is crucial.

### 2.3. `expanded`
The `expanded` mode increases spacing, padding, and potentially font sizes, providing more whitespace and larger visual elements. This mode is suitable for users who prefer a more relaxed visual experience, have visual impairments, or are using larger displays.

## 3. CSS Variable Mapping

Density modes will be implemented by overriding specific CSS variables based on the `data-density` attribute. The base unit for spacing is `var(--dash-space-unit)` (currently `4px`) as defined in `public/shared/lifeos-dashboard-tokens.css`.

New CSS variables will be introduced to control card-specific spacing and typography:

*   `--dash-card-padding`: Inner padding of a dashboard card.
*   `--dash-card-gap`: Spacing between elements within a card (e.g., between title and content, or list items).
*   `--dash-card-font-size-base`: Base font size for card content.
*   `--dash-card-font-size-sm`: Smaller font size for secondary text (e.g., metadata).
*   `--dash-card-icon-size`: Size of icons within cards.

The following CSS structure illustrates how these variables will be applied:

```css
/* Default (balanced) density */
[data-density="balanced"] {
  --dash-card-padding: calc(3 * var(--dash-space-unit)); /* 12px */
  --dash-card-gap: calc(2 * var(--dash-space-unit));     /* 8px */
  --dash-card-font-size-base: 0.875rem; /* 14px */
  --dash-card-font-size-sm: 0.75rem;    /* 12px */
  --dash-card-icon-size: 1.25rem;       /* 20px */
}

/* Compact density */
[data-density="compact"] {
  --dash-card-padding: calc(2 * var(--dash-space-unit)); /* 8px */
  --dash-card-gap: calc(1 * var(--dash-space-unit));     /* 4px */
  --dash-card-font-size-base: 0.8125rem; /* 13px */
  --dash-card-font-size-sm: 0.6875rem;   /* 11px */
  --dash-card-icon-size: 1rem;           /* 16px */
}

/* Expanded density */
[data-density="expanded"] {
  --dash-card-padding: calc(4 * var(--dash-space-unit)); /* 16px */
  --dash-card-gap: calc(3 * var(--dash-space-unit));     /* 12px */
  --dash-card-font-size-base: 0.9375rem; /* 15px */
  --dash-card-font-size-sm: 0.8125rem;   /* 13px */
  --dash-card-icon-size: 1.5rem;         /* 24px */
}

/* Example usage within a card component */
.dashboard-card {
  padding: var(--dash-card-padding);
  gap: var(--dash-card-gap);
  font-size: var(--dash-card-font-size-base);
}

.dashboard-card .meta-text {
  font-size: var(--dash-card-font-size-sm);
}

.dashboard-card .icon {
  width: var(--dash-card-icon-size);
  height: var(--dash-card-icon-size);
}
```

## 4. DOM Data Attribute Integration

The active density mode will be set on a high-level DOM element, typically the `<body>` or the main dashboard container `div`, using the `data-density` attribute.

Example:
```html
<body data-theme="dark" data-density="balanced">
  <div id="lifeos-dashboard-root">
    <!-- Dashboard cards and other components -->
  </div>
</body>
```

Changing the `data-density` attribute (e.g., from `balanced` to `compact`) will automatically apply the corresponding CSS variable overrides, adjusting the visual density of all affected components.

## 5. Mobile Constraints

On mobile devices (screens typically below `768px` width), the default density will be `compact` to optimize for screen real estate. Users will still have the option to switch to `balanced` or `expanded`, but the UI should gracefully handle potential overflow or layout issues.

*   **Default Mobile Density:** `compact`.
*   **Responsive Adjustments:** While CSS variables will adjust spacing, specific card layouts may require media queries to adapt their structure (e.g., stacking elements instead of displaying them side-by-side) to prevent horizontal scrolling or excessive truncation, especially in `expanded` mode.
*   **User Override:** If a user explicitly selects `expanded` mode on a mobile device, the system will respect this choice, but the UI may present a less optimal experience due to space constraints.

## 6. Customization State Integration

The user's preferred dashboard density mode will be stored as part of their customization state. This ensures persistence across sessions and devices.

The `DASHBOARD_CUSTOMIZATION_STATE.md` document (or its equivalent) should be updated to include a new field:

```json
{
  // ... existing customization fields
  "dashboardDensity": "balanced" // Allowed values: "compact", "balanced", "expanded"
}
```

The frontend application will read this value on load and apply the corresponding `data-density` attribute to the dashboard root element. Any user interaction to change the density will update this state and persist it.

## 7. Rollout Plan

The introduction of dashboard density modes will follow a phased rollout:

1.  **Phase 1: `balanced` (Default)**
    *   Implement the `balanced` mode as the default. All existing dashboard layouts will implicitly use these values.
    *   Ensure all core dashboard cards correctly consume the new CSS variables.
2.  **Phase 2: `compact`**
    *   Introduce the `compact` mode as an optional setting.
    *   Provide a UI control (e.g., in user settings or a dashboard toolbar) for users to switch to `compact`.
    *   Thoroughly test `compact` mode across all dashboard cards and responsive breakpoints.
3.  **Phase 3: `expanded`**
    *   Introduce the `expanded` mode as an optional setting.
    *   Ensure the UI control allows switching to `expanded`.
    *   Thoroughly test `expanded` mode, paying close attention to potential layout issues on smaller screens or with complex card content.