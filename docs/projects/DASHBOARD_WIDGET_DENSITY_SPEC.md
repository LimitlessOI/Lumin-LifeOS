The task asks for a Markdown specification, but the output contract demands a full HTML file and implementation code. Required `docs/projects` files are missing, making the specification incomplete.

### Dashboard Card Density Specification

This document outlines the proposed implementation for dashboard card density modes: Compact, Balanced, and Expanded. These modes will adjust the visual spacing and information density of dashboard widgets, catering to user preference and screen size.

### 1. Density Modes

Three primary density modes are defined:

*   **Compact:** Maximizes information display by reducing padding, margins, and font sizes where appropriate. Ideal for users who want to see more at a glance, especially on larger screens.
*   **Balanced (Default):** The current default layout, offering a comfortable balance between information density and visual breathing room.
*   **Expanded:** Prioritizes readability and visual separation with increased padding, larger text, and more generous spacing. Suitable for users who prefer a less dense interface or have visual accessibility needs.

### 2. Token Mapping (CSS Variables)

Density modes will be controlled primarily through CSS variables, allowing for dynamic adjustments based on a root `data-density` attribute. The `public/shared/lifeos-dashboard-tokens.css` file will be extended to define these variables, and `public/overlay/lifeos-dashboard.html`'s inline styles will be updated to use them.

**Proposed CSS Variables and their adjustments:**

| Variable Name             | Balanced (Current) | Compact (Proposed) | Expanded (Proposed) | Affected Elements                               |
| :------------------------ | :----------------- | :----------------- | :----------------- | :---------------------------------------------- |
| `--dash-card-padding`     | `20px`             | `12px`             | `28px`             | `.card` padding                                 |
| `--dash-card-label-mb`    | `14px`             | `8px`              | `20px`             | `.card-label` `margin-bottom`                   |
| `--dash-card-gap`         | `16px` (two-col)   | `12px`             | `24px`             | `.two-col` `gap`                                |
| `--dash-mit-item-padding` | `10px 0`           | `6px 0`            | `14px 0`           | `.mit-item` padding                             |
| `--dash-mit-check-size`   | `22px`             | `18px`             | `26px`             | `.mit-check` width/height                       |
| `--dash-mit-text-fs`      | `15px`             | `13px`             | `17px`             | `.mit-text` `font-size`                         |
| `--dash-event-row-padding`| `9px 0`            | `5px 0`            | `12px 0`           | `.event-row` padding                            |
| `--dash-event-time-fs`    | `12px`             | `10px`             | `14px`             | `.event-time` `font-size`                       |
| `--dash-event-title-fs`   | `14px`             | `12px`             | `16px`             | `.event-title` `font-size`                      |
| `--dash-goal-row-mb`      | `16px`             | `10px`             | `20px`             | `.goal-row` `margin-bottom`                     |
| `--dash-goal-name-fs`     | `14px`             | `12px`             | `16px`             | `.goal-name` `font-size`                        |
| `--dash-goal-pct-fs`      | `13px`             | `11px`             | `15px`             | `.goal-pct` `font-size`                         |
| `--dash-score-tile-padding`| `16px`            | `10px`             | `20px`             | `.score-tile` padding                           |
| `--dash-score-ring-size`  | `72px`             | `60px`             | `84px`             | `.score-ring` width/height                      |
| `--dash-score-num-fs`     | `20px`             | `16px`             | `24px`             | `.score-num` `font-size`                        |
| `--dash-score-label-fs`   | `11px`             | `9px`              | `13px`             | `.score-label` `font-size`                      |
| `--dash-chat-msg-padding` | `10px 14px`        | `8px 12px`         | `12px 16px`        | `.msg` padding                                  |
| `--dash-chat-msg-fs`      | `14px`             | `12px`             | `16px`             | `.msg` `font-size`                              |
| `--dash-chat-messages-gap`| `8px`              | `6px`              | `10px`             | `.chat-messages` `gap`                          |
| `--dash-chat-input-padding`| `10px 14px`       | `8px 12px`         | `12px 16px`        | `.chat-row input` padding                       |
| `--dash-hdr-btn-size`     | `36px`             | `32px`             | `40px`             | `.hdr-btn` width/height                         |
| `--dash-hdr-btn-fs`       | `17px`             | `15px`             | `19px`             | `.hdr-btn` `font-size`                          |
| `--dash-greeting-fs`      | `clamp(26px, 5vw, 38px)` | `clamp(22px, 4vw, 32px)` | `clamp(30px, 6vw, 44px)` | `.greeting` `font-size`                         |
| `--dash-greeting-sub-fs`  | `14px`             | `12px`             | `16px`             | `.greeting-sub` `font-size`                     |
| `--dash-page-padding`     | `24px 16px`        | `16px 12px`        | `32px 20px`        | `.page` padding                                 |

*Note: The `clamp` function for `--dash-greeting-fs` will need careful adjustment to ensure responsive behavior across densities.*

### 3. DOM Data Attributes

The selected density mode will be applied to the `<html>` element as a `data-density` attribute.

**Example:**
`<html lang="en" data-theme="dark" data-density="compact">`

CSS rules will then target this attribute:

```css
html[data-density="compact"] {
  --dash-card-padding: 12px;
  /* ... other compact variables ... */
}

html[data-density="expanded"] {
  --dash-card-padding: 28px;
  /* ... other expanded variables ... */
}
```

### 4. Mobile Constraints

On mobile viewports (e.g., `< 640px`), the dashboard will default to `balanced` or `compact` density, regardless of the user's preference for `expanded`. The `expanded` mode will be automatically scaled down to `balanced` to ensure usability and prevent excessive scrolling.

*   **Media Queries:** Density adjustments will be nested within media queries to ensure mobile-first responsiveness.
*   **User Choice:** On mobile, the density selector UI might only offer `compact` and `balanced`, or `expanded` might be visually disabled/greyed out.

### 5. Intersection with Customization State

The user's preferred dashboard density will be stored in `localStorage` under a key like `lifeos_dashboard_density`.

**Initial Load Logic (in `lifeos-dashboard.html` `<script type="module">`):**

1.  On `DOMContentLoaded`, check `localStorage.getItem('lifeos_dashboard_density')`.
2.  If a value (`compact`, `balanced`, `expanded`) is found, apply it to `document.documentElement.dataset.density`.
3.  If no value is found, default to `balanced` and set `localStorage.setItem('lifeos_dashboard_density', 'balanced')`.
4.  On mobile viewports, override `expanded` to `balanced` if `window.innerWidth < 640px`.

**User Interaction:**

*   A new control element (e.g., a button or dropdown) will be added to the `.hdr-controls` section of `lifeos-dashboard.html`.
*   When the user selects a density, the `data-density` attribute on `<html>` will be updated, and the new preference will be saved to `localStorage`.
*   (Future consideration): Integrate with a user settings API (`/api/v1/lifeos/user/settings`) to persist density preference across devices. This is out of scope for the current task but should be noted for future work.

### 6. Rollout Order

1.  **Define CSS Variables:** Add new density-specific CSS variables to `public/shared/lifeos-dashboard-tokens.css` and update existing inline styles in `public/overlay/lifeos-dashboard.html` to use these variables.
2.  **Implement `data-density` CSS:** Add the `html[data-density="..."]` rules to `public/overlay/lifeos-dashboard.html`'s `<style>` block.
3.  **Update `lifeos-dashboard.html` Script:** Implement the `localStorage` read/write logic and `data-density` attribute application on `DOMContentLoaded`.
4.  **Add UI Control:** Introduce a new button or dropdown in the header (`.hdr-controls`) to allow users to switch between density modes.
5.  **Mobile Responsiveness:** Ensure media queries correctly handle density scaling on smaller screens.

This specification provides a framework for implementing dashboard density, leveraging existing CSS variable patterns and `localStorage` for user preferences.