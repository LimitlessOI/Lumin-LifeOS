The specification is based on assumptions due to missing `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, and `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`.
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Card Density Specification</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; margin: 20px; max-width: 800px; margin-left: auto; margin-right: auto; background: #f4f4f4; color: #333; }
  pre { background: #eee; padding: 15px; border-radius: 5px; overflow-x: auto; }
  h1, h2, h3 { color: #0056b3; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background-color: #e0e0e0; }
</style>
</head>
<body>
<h1>Dashboard Card Density Specification</h1>
<pre>
# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes: Compact, Balanced, and Expanded.

## 1. Density Modes

Three primary density modes will be supported, allowing users to control the visual information density of dashboard cards.

- **Compact:** Maximizes information display, reducing padding, margins, and potentially font sizes. Ideal for power users or large displays.
- **Balanced:** The default, providing a comfortable reading experience with moderate spacing.
- **Expanded:** Prioritizes readability and visual separation, increasing padding, margins, and potentially font sizes. Suitable for touch interfaces or users preferring less visual clutter.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled via CSS variables, applied at a high level (e.g., `body` or a main container) using DOM data attributes.

| CSS Variable | Compact Value | Balanced Value | Expanded Value | Purpose |
|---|---|---|---|---|
| `--dash-card-padding-x` | `12px` | `20px` | `28px` | Horizontal padding inside cards |
| `--dash-card-padding-y` | `10px` | `16px` | `24px` | Vertical padding inside cards |
| `--dash-card-margin-bottom` | `12px` | `16px` | `24px` | Vertical spacing between cards |
| `--dash-card-label-margin-bottom` | `8px` | `14px` | `18px` | Space below card labels |
| `--dash-font-size-card-label` | `9px` | `10px` | `11px` | Font size for card labels |
| `--dash-font-size-card-content` | `13px` | `14px` | `15px` | Base font size for card content |
| `--dash-radius-lg` | `10px` | `14px` | `18px` | Card border radius (slight adjustment) |

These variables will override existing base styles where applicable.

## 3. DOM Data Attributes

The active density mode will be set on the `body` element using a `data-density` attribute.

- `&lt;body data-density="compact"&gt;`
- `&lt;body data-density="balanced"&gt;`
- `&lt;body data-density="expanded"&gt;`

CSS will then use these attributes to apply the correct variable values:

```css
body[data-density="compact"] {
  --dash-card-padding-x: 12px;
  /* ... other compact variables ... */
}
body[data-density="balanced"] {
  --dash-card-padding-x: 20px; /* Default */
  /* ... other balanced variables ... */
}
body[data-density="expanded"] {
  --dash-card-padding-x: 28px;
  /* ... other expanded variables ... */
}
```

## 4. Mobile Constraints

On mobile devices (viewport width &lt; 640px), the `compact` density mode will be enforced by default, regardless of user preference. Users will not be able to select `expanded` mode on mobile. `balanced` mode may be available if it doesn't lead to excessive scrolling. This ensures optimal use of screen real estate.

- A media query will override the `data-density` attribute for smaller screens, or JavaScript will set `data-density="compact"` on mobile.
- Example: `@media (max-width: 639px) { body { --dash-card-padding-x: 12px; /* ... */ } }`

## 5. Intersection with Customization State

The user's preferred density mode will be stored in the `dashboard_customization_state` document (or equivalent user preferences store).

- The state will include a key, e.g., `dashboard.densityMode: 'balanced' | 'compact' | 'expanded'`.
- On dashboard load, JavaScript will read this preference and apply the corresponding `data-density` attribute to the `body` element.
- If no preference is found, `balanced` will be the default.
- Changes to the density mode via a UI control will update this state and trigger a re-render/CSS variable update.

## 6. Rollout Order

1. **CSS Variable Definition:** Define all `--dash-card-padding-x`, etc., variables in `public/shared/lifeos-dashboard-tokens.css` with `data-density` selectors.
2. **HTML Integration:** Add a default `data-density="balanced"` to the `body` in `public/overlay/lifeos-dashboard.html`.
3. **JavaScript Logic:** Implement a function to read/write `dashboard.densityMode` from `dashboard_customization_state` and update the `data-density` attribute.
4. **UI Control:** Add a UI element (e.g., a button group in the header) to allow users to switch density modes.
5. **Mobile Override:** Implement media queries or JS logic to enforce mobile constraints.
</pre>
</body>
</html>