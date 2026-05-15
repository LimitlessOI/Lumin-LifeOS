The task asks for a Markdown specification, but the general output contract demands a full HTML file. Proceeding with Markdown as per the specific task instruction.

# Dashboard Card Density Specification

## 1. Density Modes

Three distinct card density modes will be supported, allowing users to customize the visual information density of dashboard widgets.

*   **Balanced (Default)**: The current default layout, offering a comfortable reading experience with moderate spacing. This mode prioritizes readability and visual separation.
*   **Compact**: Reduces spacing, padding, and font sizes to display more information within the same screen area. Ideal for users who prefer a high information density.
*   **Expanded**: Increases spacing, padding, and font sizes for a more spacious, less cluttered appearance. Prioritizes visual comfort and larger touch targets, potentially useful for accessibility or specific viewing preferences.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled by a `data-card-density` attribute on the `<body>` element. This attribute will dynamically adjust CSS variables, which in turn control spacing, padding, and font sizes within dashboard cards.

### Core Density Variables

New CSS variables will be introduced to manage density-specific values. These should be defined in `public/shared/lifeos-dashboard-tokens.css` or a new dedicated density CSS file.

*   `--card-padding-x`: Horizontal padding inside cards.
*   `--card-padding-y`: Vertical padding inside cards.
*   `--card-label-margin-bottom`: Margin below card labels.
*   `--card-item-padding-y`: Vertical padding for list items within cards (e.g., MITs, events).
*   `--card-item-gap`: Gap between elements within list items.
*   `--card-font-size-label`: Font size for card labels.
*   `--card-font-size-item`: Font size for main list item text.
*   `--card-font-size-sub`: Font size for secondary/sub-text within cards.

### Mode-Specific Variable Overrides

These variables will be set based on the `data-card-density` attribute on the `<body>` tag. The values are derived using `var(--dash-space-unit, 8px)` for consistency.

```css
body[data-card-density="compact"] {
  --card-padding-x: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --card-padding-y: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 1); /* 8px */
  --card-item-padding-y: calc(var(--dash-space-unit) * 0.75); /* 6px */
  --card-item-gap: calc(var(--dash-space-unit) * 1); /* 8px */
  --card-font-size-label: 9px;
  --card-font-size-item: 13px;
  --card-font-size-sub: 10px;
}

body[data-card-density="balanced"] { /* Default, aligns with current base styles */
  --card-padding-x: calc(var(--dash-space-unit) * 2.5); /* 20px */
  --card-padding-y: calc(var(--dash-space-unit) * 2.5); /* 20px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 1.75); /* 14px */
  --card-item-padding-y: calc(var(--dash-space-unit) * 1.25); /* 10px */
  --card-item-gap: calc(var(--dash-space-unit) * 1.5); /* 12px */
  --card-font-size-label: 10px;
  --card-font-size-item: 15px;
  --card-font-size-sub: 11px;
}

body[data-card-density="expanded"] { /* Aligns with current desktop styles where applicable */
  --card-padding-x: calc(var(--dash-space-unit) * 3.5); /* 28px */
  --card-padding-y: calc(var(--dash-space-unit) * 3.5); /* 28px */
  --card-label-margin-bottom: calc(var(--dash-space-unit) * 2.25); /* 18px */
  --card-item-padding-y: calc(var(--dash-space-unit) * 1.75); /* 14px */
  --card-item-gap: calc(var(--dash-space-unit) * 2); /* 16px */
  --card-font-size-label: 11px;
  --card-font-size-item: 16px;
  --card-font-size-sub: 12px;
}
```

Existing CSS rules in `public/overlay/lifeos-dashboard.html` will be updated to use these new variables. Examples:

```css
.card {
  padding: var(--card-padding-y) var(--card-padding-x);
}
.card-label {
  margin-bottom: var(--card-label-margin-bottom);
  font-size: var(--card-font-size-label);
}
.mit-item {
  padding: var(--card-item-padding-y) 0;
  gap: var(--card-item-gap);
}
.mit-text {
  font-size: var(--card-font-size-item);
}
.event-row {
  padding: var(--card-item-padding-y) 0;
  gap: var(--card-item-gap);
}
.event-title {
  font-size: var(--card-font-size-item);
}
.goal-name {
  font-size: var(--card-font-size-item);
}
.goal-sub {
  font-size: var(--card-font-size-sub);
}
.score-label {
  font-size: var(--card-font-size-sub);
}
.msg {
  font-size: var(--card-font-size-item);
}
.msg.ambient {
  font-size: var(--card-font-size-sub);
}
```

## 3. DOM Data Attributes

The primary mechanism for applying density will be a `data-card-density` attribute on the `<body>` tag.

Example: `<body data-card-density="compact">`

This attribute will be dynamically set by JavaScript based on user preference.

## 4. Mobile Constraints

On mobile devices (e.g., `@media (max-width: 639px)`), the dashboard will default to a `balanced` or `compact` density, regardless of the user's chosen desktop density. This ensures optimal use of limited screen real estate and maintains touch target sizes.

*   The `data-card-density` attribute will still be present, but mobile-specific media queries will override density-related CSS variables to ensure a consistent and usable mobile experience.
*   For example, within mobile media queries, `--card-padding-x`, `--card-padding-y`, and font sizes might be capped or fixed to prevent an "expanded" mode from making cards excessively large or unreadable on small screens. The existing `@media (min-width: 640px)` and `@media (min-width: 1000px)` blocks in `lifeos-dashboard.html` will need to be reviewed and potentially adjusted to integrate with these new density variables, ensuring desktop-specific overrides are applied correctly *after* the base density.

## 5. Customization State Document Intersection

The user's preferred dashboard density mode will be stored as part of the `DASHBOARD_CUSTOMIZATION_STATE`.

*   **Storage**: The chosen density mode (e.g., "compact", "balanced", "expanded") will be stored in `localStorage` under a key like `lifeos_dashboard_density`. This aligns with the existing `lifeos_theme` pattern.
*   **Structure**: The `DASHBOARD_CUSTOMIZATION_STATE.md` (if available) would define a JSON structure for user preferences. We will assume a simple string value for density.
*   **Application**: On `DOMContentLoaded`, JavaScript will read `localStorage.getItem('lifeos_dashboard_density')`. If a valid value is found, it will be applied to `document.body.dataset.cardDensity`. If no value is found or it's invalid, `balanced` will be used as the default.
*   **UI Control**: A new UI control (e.g., a button or dropdown in the header) will be added to allow users to switch between density modes. This control will update both `localStorage` and the `data-card-density` attribute.

Example JavaScript logic (to be added to `public/overlay/lifeos-dashboard.html`'s script block):

```javascript
// Function to apply density
function applyDashboardDensity(mode) {
  if (!['compact', 'balanced', 'expanded'].includes(mode)) {
    mode = 'balanced'; // Fallback to default
  }
  document.body.dataset.cardDensity = mode;
  localStorage.setItem('lifeos_dashboard_density', mode);
  // Optionally, update a UI control to reflect the current mode
}

// On DOMContentLoaded, after theme logic
const savedDensity = localStorage.getItem('lifeos_dashboard_density');
applyDashboardDensity(savedDensity); // Will default to 'balanced' if savedDensity is null or invalid

// Example UI control handler (e.g., a button click)
// function cycleDensity() {
//   const current = document.body.dataset.cardDensity;
//   const modes = ['balanced', 'compact', 'expanded'];
//   const nextIndex = (modes.indexOf(current) + 1) % modes.length;
//   applyDashboardDensity(modes[nextIndex]);
// }
```

## 6. Rollout Order

1.  **Define Core Density Variables**: Add the new `--card-padding-x`, `--card-padding-y`, etc., to `public/shared/lifeos-dashboard-tokens.css`.
2.  **Apply Mode-Specific Overrides**: Add the `body[data-card-density="..."]` rules to `public/shared/lifeos-dashboard-tokens.css` (or a new `public/shared/lifeos-dashboard-density.css` if preferred for better modularity).
3.  **Refactor Existing CSS**: Update `public/overlay/lifeos-dashboard.html`'s `<style>` block to use the new density CSS variables for relevant elements (e.g., `.card`, `.card-label`, `.mit-item`, `.event-row`, `.goal-row`, `.score-tile`, `.msg`).
4.  **Implement JavaScript Logic**: Add the `applyDashboardDensity` function and initial load logic to `public/overlay/lifeos-dashboard.html`'s `<script type="module">` block.
5.  **Develop UI Control**: Create a UI element (e.g., a button in `hdr-controls`) to allow users to switch density modes, integrating it with the `applyDashboardDensity` function.
6.  **Mobile Responsiveness Review**: Thoroughly test on various mobile devices and screen sizes to ensure media queries correctly override density settings for optimal mobile UX, preventing layout issues or unreadable text.