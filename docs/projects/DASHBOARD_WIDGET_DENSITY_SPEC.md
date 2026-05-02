The task explicitly requests a Markdown specification, but the "HTML FULL FILE — STRICT OUTPUT CONTRACT" at the end of the prompt demands an HTML document. I am proceeding with the Markdown specification as per the explicit "SPECIFICATION" instruction, assuming the HTML contract is a boilerplate error for this documentation task.

# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes, including their mapping to CSS variables, DOM data attributes, mobile constraints, and integration with the dashboard customization state.

## 1. Density Modes

The LifeOS Dashboard will support three distinct density modes, allowing users to adjust the visual information density of their cards. These modes align with the `DashboardDensity` enum defined in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`.

*   **`compact`**: Maximizes information display by reducing spacing, padding, and potentially font sizes. Ideal for users who want to see more content at a glance.
*   **`comfortable`** (Default): Provides a balanced view with moderate spacing and readability. This will be the initial default experience. (Note: The task brief mentioned "balanced", which maps to this `comfortable` mode in the existing state contract).
*   **`spacious`**: Enhances readability and visual separation with increased spacing and padding. Ideal for users who prefer a less cluttered interface. (Note: The task brief mentioned "expanded", which maps to this `spacious` mode in the existing state contract).

## 2. Token Mapping and CSS Variables

Density modes will be controlled via a `data-density` attribute on the `<html>` element (e.g., `<html data-density="compact">`). This attribute will trigger specific CSS variable overrides to adjust visual properties.

A new set of semantic CSS variables will be introduced to control spacing, padding, and font sizes within cards and their contents. These variables will then be overridden based on the `data-density` attribute.

**Base Variables (defined in `:root` or `html[data-theme]`)**:
These will represent the `comfortable` defaults. These variables should be added to `public/shared/lifeos-dashboard-tokens.css`.

```css
/* Add these to public/shared/lifeos-dashboard-tokens.css */
:root {
  /* Base spacing unit for scaling */
  --dash-space-unit: 4px; /* Existing */

  /* Card specific */
  --card-padding-y: calc(5 * var(--dash-space-unit)); /* 20px */
  --card-padding-x: calc(5 * var(--dash-space-unit)); /* 20px */
  --card-label-margin-bottom: calc(3.5 * var(--dash-space-unit)); /* 14px */
  --card-gap-y: calc(4 * var(--dash-space-unit)); /* For internal lists like MITs, Calendar */

  /* Item specific (e.g., MITs, Calendar events) */
  --item-padding-y: calc(2.5 * var(--dash-space-unit)); /* 10px for mit-item */
  --item-gap-x: calc(3 * var(--dash-space-unit)); /* 12px for mit-item, event-row */
  --item-font-size: 15px; /* For mit-text */
  --item-line-height: 1.4;

  /* Event specific */
  --event-item-padding-y: calc(2.25 * var(--dash-space-unit)); /* 9px for event-row */
  --event-time-font-size: 12px;
  --event-title-font-size: 14px;

  /* Goal specific */
  --goal-row-margin-bottom: calc(4 * var(--dash-space-unit)); /* 16px */
  --goal-header-margin-bottom: calc(1.5 * var(--dash-space-unit)); /* 6px */
  --goal-name-font-size: 14px;
  --goal-pct-font-size: 13px;
  --goal-sub-font-size: 11px;

  /* Score specific */
  --scores-grid-gap: calc(3 * var(--dash-space-unit)); /* 12px */
  --score-tile-padding: calc(4 * var(--dash-space-unit)); /* 16px */
  --score-ring-size: 72px;
  --score-ring-margin-bottom: calc(2 * var(--dash-space-unit)); /* 8px */
  --score-num-font-size: 20px;
  --score-label-font-size: 11px;

  /* Chat specific */
  --chat-messages-height: 240px;
  --chat-messages-gap: calc(2 * var(--dash-space-unit)); /* 8px */
  --chat-msg-padding-y: calc(2.5 * var(--dash-space-unit)); /* 10px */
  --chat-msg-padding-x: calc(3.5 * var(--dash-space-unit)); /* 14px */
  --chat-msg-font-size: 14px;
  --chat-input-padding-y: calc(2.5 * var(--dash-space-unit)); /* 10px */
  --chat-input-padding-x: calc(3.5 * var(--dash-space-unit)); /* 14px */
  --chat-input-font-size: 14px;
  --chat-row-gap: calc(2 * var(--dash-space-unit)); /* 8px */
  --btn-mic-size: 44px;
  --btn-send-size: 44px;
}
```

**Density-specific Overrides**:
These overrides should be added to `public/shared/lifeos-dashboard-tokens.css` after the base `:root` block.

```css
/* Density-specific overrides */
html[data-density="compact"] {
  --card-padding-y: calc(4 * var(--dash-space-unit)); /* e.g., 16px */
  --card-padding-x: calc(4 * var(--dash-space-unit)); /* e.g., 16px */
  --card-label-margin-bottom: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --card-gap-y: calc(3 * var(--dash-space-unit)); /* e.g., 12px */

  --item-padding-y: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --item-gap-x: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --item-font-size: 14px;
  --item-line-height: 1.3;

  --event-item-padding-y: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --event-time-font-size: 11px;
  --event-title-font-size: 13px;

  --goal-row-margin-bottom: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --goal-header-margin-bottom: calc(1 * var(--dash-space-unit)); /* e.g., 4px */
  --goal-name-font-size: 13px;
  --goal-pct-font-size: 12px;
  --goal-sub-font-size: 10px;

  --scores-grid-gap: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --score-tile-padding: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --score-ring-size: 64px;
  --score-ring-margin-bottom: calc(1.5 * var(--dash-space-unit)); /* e.g., 6px */
  --score-num-font-size: 18px;
  --score-label-font-size: 10px;

  --chat-messages-height: 200px;
  --chat-messages-gap: calc(1.5 * var(--dash-space-unit)); /* e.g., 6px */
  --chat-msg-padding-y: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --chat-msg-padding-x: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --chat-msg-font-size: 13px;
  --chat-input-padding-y: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --chat-input-padding-x: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --chat-input-font-size: 13px;
  --chat-row-gap: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --btn-mic-size: 40px;
  --btn-send-size: 40px;
}

html[data-density="spacious"] {
  --card-padding-y: calc(6 * var(--dash-space-unit)); /* e.g., 24px */
  --card-padding-x: calc(6 * var(--dash-space-unit)); /* e.g., 24px */
  --card-label-margin-bottom: calc(4.5 * var(--dash-space-unit)); /* e.g., 18px */
  --card-gap-y: calc(5 * var(--dash-space-unit)); /* e.g., 20px */

  --item-padding-y: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --item-gap-x: calc(3.5 * var(--dash-space-unit)); /* e.g., 14px */
  --item-font-size: 16px;
  --item-line-height: 1.5;

  --event-item-padding-y: calc(2.75 * var(--dash-space-unit)); /* e.g., 11px */
  --event-time-font-size: 13px;
  --event-title-font-size: 15px;

  --goal-row-margin-bottom: calc(5 * var(--dash-space-unit)); /* e.g., 20px */
  --goal-header-margin-bottom: calc(2 * var(--dash-space-unit)); /* e.g., 8px */
  --goal-name-font-size: 15px;
  --goal-pct-font-size: 14px;
  --goal-sub-font-size: 12px;

  --scores-grid-gap: calc(4 * var(--dash-space-unit)); /* e.g., 16px */
  --score-tile-padding: calc(5 * var(--dash-space-unit)); /* e.g., 20px */
  --score-ring-size: 80px;
  --score-ring-margin-bottom: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --score-num-font-size: 22px;
  --score-label-font-size: 12px;

  --chat-messages-height: 280px;
  --chat-messages-gap: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --chat-msg-padding-y: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --chat-msg-padding-x: calc(4 * var(--dash-space-unit)); /* e.g., 16px */
  --chat-msg-font-size: 15px;
  --chat-input-padding-y: calc(3 * var(--dash-space-unit)); /* e.g., 12px */
  --chat-input-padding-x: calc(4 * var(--dash-space-unit)); /* e.g., 16px */
  --chat-input-font-size: 15px;
  --chat-row-gap: calc(2.5 * var(--dash-space-unit)); /* e.g., 10px */
  --btn-mic-size: 48px;
  --btn-send-size: 48px;
}
```

**Applying to HTML/CSS:**
Existing hardcoded values in `public/overlay/lifeos-dashboard.html`'s `<style>` block will need to be replaced with these new CSS variables. For example:
*   `.card { padding: 20px; }` becomes `.card { padding: var(--card-padding-y) var(--card-padding-x); }`
*   `.card-label { margin-bottom: 14px; }` becomes `.card-label { margin-bottom: var(--card-label-margin-bottom); }`
*   `.mit-item { padding: 10px 0; gap: 12px; }` becomes `.mit-item { padding: var(--item-padding-y) 0; gap: var(--item-gap-x); }`
*   Similarly for all other elements affected by density.

## 3. DOM Data Attributes

The selected density mode will be stored in `localStorage` and applied as a `data-density` attribute on the `<html>` element during page load.

Example:
`<html lang="en" data-theme="dark" data-density="comfortable">`

This attribute will be set by client-side JavaScript, likely within `lifeos-bootstrap.js` or a new dedicated script for dashboard layout management, reading from `localStorage.getItem('lifeos_dashboard_layout').density`.

## 4. Mobile Constraints

Density modes will primarily affect desktop and tablet layouts. On mobile devices (viewport width below `640px`), the density modes will have a reduced or no effect, defaulting to a `compact`-like experience to ensure optimal use of limited screen real estate.

The existing media queries (`@media (min-width: 640px)` and `@media (min-width: 1000px)`) will continue to apply. The density-specific CSS overrides should be designed to gracefully degrade for smaller viewports. For instance, mobile-specific padding/spacing values defined within media queries might override density settings, or density settings might only apply above a certain breakpoint.

## 5. Intersection with Customization State Document

The `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md` document defines the `DashboardLayoutState` interface, which includes a `density: DashboardDensity;` field.

*   **Storage**: The user's selected density mode (`'compact'`, `'comfortable'`, or `'spacious'`) will be stored in `localStorage` under the `lifeos_dashboard_layout` key, specifically in the `density` field of the `DashboardLayoutState` object.
*   **Loading**: On dashboard load, client-side JavaScript will read the `density` value from `localStorage`. If no value is found or it's invalid, the default `comfortable` mode will be used.
*   **Application**: The retrieved `density` value will be used to set the `data-density` attribute on the `<html>` element, dynamically applying the corresponding CSS styles.
*   **UI Control**: A new UI control (e.g., a button group or dropdown in the header) will be added to allow users to switch between density modes. Changing the mode will update the `data-density` attribute and persist the new value to `localStorage`.

## 6. Rollout Order

1.  **Define Semantic CSS Variables**: Introduce the new semantic spacing/sizing variables in `public/shared/lifeos-dashboard-tokens.css`.
2.  **Refactor Existing CSS**: Replace hardcoded spacing/padding/font-size values in `public/overlay/lifeos-dashboard.html`'s inline `<style>` block with the new semantic CSS variables.
3.  **Implement Density Overrides**: Add `html[data-density="compact"]` and `html[data-density="spacious"]` CSS blocks to `public/shared/lifeos-dashboard-tokens.css` to override the semantic variables.
4.  **Client-Side Logic for `data-density`**: Modify `public/overlay/lifeos-dashboard.html`'s `<script type="module">` block (or a new dashboard-specific JS file) to read the `density` from `localStorage` (using the `lifeos_dashboard_layout` key) and apply it to `document.documentElement.dataset.density` on `DOMContentLoaded`.
5.  **Add UI Controls**: Implement buttons or a dropdown in the dashboard header (`public/overlay/lifeos-dashboard.html`) to allow users to select their preferred density, updating both the DOM attribute and `localStorage`.
6.  **Testing**: Thoroughly test all density modes across different screen sizes and ensure visual consistency and responsiveness.