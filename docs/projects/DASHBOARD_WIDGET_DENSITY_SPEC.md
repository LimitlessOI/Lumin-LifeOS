The specification is incomplete due to missing `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, and `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`. This specification relies on inferred patterns and common UI/UX practices.

# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes (Compact, Balanced, Expanded) within the LifeOS Dashboard. This specification defines the modes, their mapping to CSS variables and DOM data attributes, mobile constraints, and integration with user customization state.

## 1. Density Modes

Three distinct density modes are defined to allow users to customize the visual information density of dashboard cards:

*   **Balanced (Default)**: Represents the current default spacing and sizing, offering a comfortable reading experience. This mode serves as the baseline.
*   **Compact**: Reduces padding, margins, and potentially font sizes to display more information within the same screen area. Ideal for users who prefer high information density.
*   **Expanded**: Increases padding, margins, and potentially font sizes for a more spacious and relaxed layout. Ideal for users who prefer less visual clutter or have accessibility needs.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled primarily through a `data-density` attribute on the `<body>` element, which will then override a set of CSS variables. A `density-scale-factor` variable will be introduced to proportionally adjust existing spacing and sizing.

### New Root CSS Variables (to be added to `public/shared/lifeos-dashboard-tokens.css` or `public/overlay/lifeos-dashboard.html` `<style>` block)

```css
:root {
  /* Base density scale factor - Balanced mode default */
  --density-scale-factor: 1;

  /* Base values for elements that will scale with density */
  --card-padding-base: 20px; /* From .card */
  --card-label-margin-bottom-base: 14px; /* From .card-label */
  --mit-item-padding-y-base: 10px; /* From .mit-item padding */
  --quick-add-margin-top-base: 14px; /* From .quick-add margin-top */
  --event-row-padding-y-base: 9px; /* From .event-row padding */
  --goal-row-margin-bottom-base: 16px; /* From .goal-row margin-bottom */
  --scores-grid-gap-base: 12px; /* From .scores-grid gap */
  --score-tile-padding-base: 16px; /* From .score-tile padding */
  --chat-messages-gap-base: 8px; /* From .chat-messages gap */
  --msg-padding-x-base: 14px; /* From .msg padding */
  --msg-padding-y-base: 10px; /* From .msg padding */
  --chat-input-padding-x-base: 14px; /* From .chat-row input padding */
  --chat-input-padding-y-base: 10px; /* From .chat-row input padding */
  --voice-footer-margin-top-base: 10px; /* From .voice-footer margin-top */
  --voice-footer-padding-top-base: 10px; /* From .voice-footer padding-top */
}
```

### Density Mode Overrides (to be added to `public/overlay/lifeos-dashboard.html` `<style>` block)

```css
body[data-density="compact"] {
  --density-scale-factor: 0.8; /* e.g., 20px -> 16px padding */
  /* Specific overrides for compact mode if needed, e.g., font sizes */
  .card-label { font-size: 9px; } /* Original 10px */
  .mit-text { font-size: 14px; } /* Original 15px */
  .event-title { font-size: 13px; } /* Original 14px */
  .goal-name { font-size: 13px; } /* Original 14px */
  .score-label { font-size: 10px; } /* Original 11px */
  .msg { font-size: 13px; } /* Original 14px */
  .chat-row input { font-size: 13px; } /* Original 14px */
}

body[data-density="expanded"] {
  --density-scale-factor: 1.2; /* e.g., 20px -> 24px padding */
  /* Specific overrides for expanded mode if needed, e.g., font sizes */
  .card-label { font-size: 11px; } /* Original 10px */
  .mit-text { font-size: 16px; } /* Original 15px */
  .event-title { font-size: 15px; } /* Original 14px */
  .goal-name { font-size: 15px; } /* Original 14px */
  .score-label { font-size: 12px; } /* Original 11px */
  .msg { font-size: 15px; } /* Original 14px */
  .chat-row input { font-size: 15px; } /* Original 14px */
}
```

### Applying Scaled Variables (modifications to existing CSS in `public/overlay/lifeos-dashboard.html`)

Existing hardcoded values will be replaced with `calc()` expressions using the base variables and `density-scale-factor`.

Example modifications:

```css
.card {
  /* padding: 20px; */
  padding: calc(var(--card-padding-base) * var(--density-scale-factor));
}
.card-label {
  /* margin-bottom: 14px; */
  margin-bottom: calc(var(--card-label-margin-bottom-base) * var(--density-scale-factor));
}
.mit-item {
  /* padding: 10px 0; */
  padding: calc(var(--mit-item-padding-y-base) * var(--density-scale-factor)) 0;
}
.quick-add {
  /* margin-top: 14px; */
  margin-top: calc(var(--quick-add-margin-top-base) * var(--density-scale-factor));
  /* padding-top: 14px; */
  padding-top: calc(var(--quick-add-margin-top-base) * var(--density-scale-factor)); /* Reusing for consistency */
}
.event-row {
  /* padding: 9px 0; */
  padding: calc(var(--event-row-padding-y-base) * var(--density-scale-factor)) 0;
}
.goal-row {
  /* margin-bottom: 16px; */
  margin-bottom: calc(var(--goal-row-margin-bottom-base) * var(--density-scale-factor));
}
.scores-grid {
  /* gap: 12px; */
  gap: calc(var(--scores-grid-gap-base) * var(--density-scale-factor));
}
.score-tile {
  /* padding: 16px; */
  padding: calc(var(--score-tile-padding-base) * var(--density-scale-factor));
}
.chat-messages {
  /* gap: 8px; */
  gap: calc(var(--chat-messages-gap-base) * var(--density-scale-factor));
}
.msg {
  /* padding: 10px 14px; */
  padding: calc(var(--msg-padding-y-base) * var(--density-scale-factor)) calc(var(--msg-padding-x-base) * var(--density-scale-factor));
}
.chat-row input {
  /* padding: 10px 14px; */
  padding: calc(var(--chat-input-padding-y-base) * var(--density-scale-factor)) calc(var(--chat-input-padding-x-base) * var(--density-scale-factor));
}
.voice-footer {
  /* margin-top: 10px; */
  margin-top: calc(var(--voice-footer-margin-top-base) * var(--density-scale-factor));
  /* padding-top: 10px; */
  padding-top: calc(var(--voice-footer-padding-top-base) * var(--density-scale-factor));
}
```

## 3. DOM Data Attributes

The density mode will be applied as a `data-density` attribute on the `<body>` element.

Example:
*   `<body data-density="compact">`
*   `<body data-density="balanced">`
*   `<body data-density="expanded">`

The JavaScript responsible for setting the density (e.g., a new `toggleDensity()` function or an initialization script) will read the user's preference and apply this attribute.

## 4. Mobile Constraints

The dashboard is designed with mobile responsiveness in mind. Density adjustments must respect mobile usability.

*   **Default Mobile Density**: On screens smaller than `640px` (the first `min-width` breakpoint), the `compact` density mode will be the effective default, regardless of the user's chosen density. This ensures optimal content visibility and interaction on small screens.
*   **Expanded Mode on Mobile**: The `expanded` mode will have no visual effect on screens smaller than `640px`. It will effectively revert to `balanced` (or `compact` if that's the mobile default).
*   **User Preference Persistence**: The user's chosen density preference (e.g., `expanded`) will still be stored, but its visual application will be constrained by the screen size. When the screen size increases beyond the mobile breakpoint, the chosen density will re-apply.

This can be achieved with media queries that reset the `density-scale-factor` for smaller screens:

```css
@media (max-width: 639px) {
  body[data-density] { /* Apply compact as effective default for all densities on mobile */
    --density-scale-factor: 0.8;
    /* Reset font sizes if they were scaled up for expanded */
    .card-label { font-size: 9px; }
    .mit-text { font-size: 14px; }
    .event-title { font-size: 13px; }
    .goal-name { font-size: 13px; }
    .score-label { font-size: 10px; }
    .msg { font-size: 13px; }
    .chat-row input { font-size: 13px; }
  }
}
```

## 5. Intersection with Customization State

Given the absence of `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`, the integration will follow the pattern established by the existing theme toggle (`toggleTheme()` function) in `public/overlay/lifeos-dashboard.html`.

*   **Storage Mechanism**: The user's preferred density mode will be stored in `localStorage` under a key such as `lifeos_dashboard_density`.
*   **Initialization**: On `DOMContentLoaded`, the dashboard's initialization script will read the `lifeos_dashboard_density` value from `localStorage`. If a value is found, it will be applied to the `<body>` element via `dataset.density`. If no value is found, `balanced` will be used as the default.
*   **User Interface**: A new control (e.g., a button or dropdown) will be added to the `.hdr-controls` section, allowing users to cycle through `compact`, `balanced`, and `expanded` modes. This control will trigger a JavaScript function (e.g., `setDensity(mode)`) that updates both the `localStorage` value and the `data-density` attribute on the `<body>`.

### Example JavaScript (Conceptual)

```javascript
// In public/overlay/lifeos-dashboard.html <script type="module">
const DENSITY_MODES = ['compact', 'balanced', 'expanded'];
let currentDensity = 'balanced'; // Default

function setDensity(mode) {
  if (!DENSITY_MODES.includes(mode)) return;
  currentDensity = mode;
  document.body.dataset.density = mode;
  localStorage.setItem('lifeos_dashboard_density', mode);
  // Update UI for density control if it exists
}

function cycleDensity() {
  const currentIndex = DENSITY_MODES.indexOf(currentDensity);
  const nextIndex = (currentIndex + 1) % DENSITY_MODES.length;
  setDensity(DENSITY_MODES[nextIndex]);
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // ... existing initVoice, theme init ...
  const storedDensity = localStorage.getItem('lifeos_dashboard_density');
  setDensity(storedDensity || 'balanced');
  // ... other initializations ...
});

// Example UI integration (add a button to hdr-controls)
// <button class="hdr-btn" id="btn-density" title="Toggle density" onclick="cycleDensity()">↔</button>
```

## 6. Rollout Order

The implementation will proceed in a phased approach:

1.  **CSS Variable Definition**: Define the new `--density-scale-factor` and all `--*-base` variables in the main stylesheet.
2.  **CSS Application**: Modify existing CSS rules to use `calc()` expressions with the new variables.
3.  **Density Mode Overrides**: Add the `body[data-density="compact"]` and `body[data-density="expanded"]` CSS blocks, including font size adjustments.
4.  **Mobile Media Query**: Implement the `@media (max-width: 639px)` rule to enforce mobile density constraints.
5.  **JavaScript Logic**:
    *   Implement `setDensity()` and `cycleDensity()` functions.
    *   Integrate density initialization into the `DOMContentLoaded` listener.
    *   Add a new button to `hdr-controls` in `public/overlay/lifeos-dashboard.html` to allow users to change density.
6.  **Testing**: Thoroughly test all density modes across various screen sizes and devices to ensure visual consistency and usability.