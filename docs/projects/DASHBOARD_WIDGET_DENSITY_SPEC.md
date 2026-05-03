The specification is incomplete due to missing `DASHBOARD_BUILDER_BRIEF.md`, `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, and `DASHBOARD_CUSTOMIZATION_STATE.md` files.

# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes (compact, balanced, expanded), their mapping to CSS variables and DOM data attributes, mobile constraints, and integration with user customization state.

## 1. Density Modes

Three primary density modes are defined to allow users to customize the visual information density of dashboard cards:

*   **Compact**: Maximizes information on screen by reducing padding, margins, and potentially font sizes. Ideal for users who want to see more at a glance.
*   **Balanced**: The default, moderate density, offering a good balance between readability and information density. This aligns with the current dashboard layout.
*   **Expanded**: Prioritizes readability and visual breathing room with increased padding and margins. Ideal for users who prefer a less cluttered interface.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled via a `data-density` attribute on the `<html>` element (e.g., `<html data-density="compact">`). This attribute will then drive specific CSS variable overrides, primarily affecting spacing.

The existing `--dash-space-unit: 8px;` from `public/shared/lifeos-dashboard-tokens.css` will serve as a base for scaling. New CSS variables will be introduced to control card-specific spacing and radii.

**Proposed CSS Variable Structure:**

```css
/* Default (Balanced) values */
:root {
  --card-padding: 20px; /* Current .card padding */
  --card-label-margin-bottom: 14px; /* Current .card-label margin-bottom */
  --card-gap-vertical: 16px; /* Gap between items within a card, e.g., MITs, events */
  --card-gap-horizontal: 12px; /* Gap for grid items, e.g., scores-grid */
  --card-radius: var(--dash-radius-lg, 14px); /* Card border-radius */
}

/* Compact Density */
[data-density="compact"] {
  --card-padding: calc(var(--dash-space-unit) * 2); /* 16px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 1.25); /* 10px */
  --card-gap-vertical: calc(var(--dash-space-unit) * 1.25); /* 10px */
  --card-gap-horizontal: calc(var(--dash-space-unit) * 1); /* 8px */
  --card-radius: var(--dash-radius-md, 10px);
}

/* Balanced Density (explicitly defined, matches default) */
[data-density="balanced"] {
  --card-padding: calc(var(--dash-space-unit) * 2.5); /* 20px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 1.75); /* 14px */
  --card-gap-vertical: calc(var(--dash-space-unit) * 2); /* 16px */
  --card-gap-horizontal: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --card-radius: var(--dash-radius-lg, 14px);
}

/* Expanded Density */
[data-density="expanded"] {
  --card-padding: calc(var(--dash-space-unit) * 3.5); /* 28px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 2.5); /* 20px */
  --card-gap-vertical: calc(var(--dash-space-unit) * 3); /* 24px */
  --card-gap-horizontal: calc(var(--dash-space-unit) * 2); /* 16px */
  --card-radius: var(--dash-radius-xl, 20px);
}
```

**Application in `public/overlay/lifeos-dashboard.html` (Conceptual, no rewrite):**

Existing hardcoded values in `.card`, `.card-label`, `.scores-grid`, `.mit-item`, `.event-row`, etc., would be replaced with these new CSS variables.

Example:
```css
/* Before */
.card {
  padding: 20px;
  border-radius: var(--radius-lg);
}
.card-label {
  margin-bottom: 14px;
}
.scores-grid {
  gap: 12px;
}

/* After (Conceptual) */
.card {
  padding: var(--card-padding);
  border-radius: var(--card-radius);
}
.card-label {
  margin-bottom: var(--card-label-margin-bottom);
}
.scores-grid {
  gap: var(--card-gap-horizontal);
}
.mit-item, .event-row {
  padding: calc(var(--card-gap-vertical) / 2) 0; /* Adjust as needed */
  gap: var(--card-gap-horizontal);
}
```

## 3. DOM Data Attributes

The density mode will be controlled by a `data-density` attribute on the `<html>` element.
Example: `<html data-theme="dark" data-density="balanced">`

A JavaScript function will be responsible for:
1.  Reading the user's preferred density from `localStorage` on `DOMContentLoaded`.
2.  Applying the `data-density` attribute to the `<html>` element.
3.  Providing a UI control (e.g., a button or dropdown) for users to change the density, which updates `localStorage` and the `data-density` attribute.

## 4. Mobile Constraints

The dashboard currently uses media queries to adjust layout for smaller screens (`min-width: 640px`, `min-width: 1000px`).
For mobile devices (screens below `640px`), the `compact` density mode should be the default and potentially the only available option to ensure optimal usability and content visibility.

**Implementation Detail:**
CSS media queries can override density-specific variables for smaller screens, ensuring that even if a user selects `expanded` on desktop, the mobile view defaults to `compact` spacing.

```css
/* Example: Force compact on small screens */
@media (max-width: 639px) {
  :root, [data-density] { /* Apply to all, overriding user preference */
    --card-padding: calc(var(--dash-space-unit) * 2); /* 16px */
    --card-label-margin-bottom: calc(var(--dash-space-unit) * 1.25); /* 10px */
    --card-gap-vertical: calc(var(--dash-space-unit) * 1.25); /* 10px */
    --card-gap-horizontal: calc(var(--dash-space-unit) * 1); /* 8px */
    --card-radius: var(--dash-radius-md, 10px);
  }
}
```

## 5. Intersection with Customization State

User density preference will be stored in `localStorage` under a key, for example, `lifeos_dashboard_density`.

**Storage Key:** `lifeos_dashboard_density`
**Possible Values:** `"compact"`, `"balanced"`, `"expanded"`
**Default Value:** `"balanced"`

**JavaScript Logic (Conceptual):**

```javascript
// On DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const savedDensity = localStorage.getItem('lifeos_dashboard_density');
  document.documentElement.dataset.density = savedDensity || 'balanced';
  // Update UI control to reflect current density
});

// Function to change density (e.g., from a UI button)
function setDashboardDensity(mode) {
  if (['compact', 'balanced', 'expanded'].includes(mode)) {
    document.documentElement.dataset.density = mode;
    localStorage.setItem('lifeos_dashboard_density', mode);
    // Update UI control state
  }
}
```

## 6. Rollout Order

The rollout order is not explicitly defined in the provided context. A typical approach would be:
1.  Implement `balanced` as the default, ensuring it matches the current visual state.
2.  Introduce `compact` and `expanded` as user-selectable options, accessible via a dashboard settings menu or a dedicated density toggle button.
3.  Ensure mobile constraints are applied from the initial rollout.