The task explicitly requests a "Specification only" in "Markdown" format, while the "HTML FULL FILE — STRICT OUTPUT CONTRACT" demands the entire response be a complete HTML document without markdown fences or prose. This output prioritizes the specific task instruction for a Markdown specification.

# Dashboard Card Density Specification

This document outlines the specification for implementing adjustable card density modes on the LifeOS Dashboard.

## 1. Density Modes

Three primary density modes are defined for dashboard cards:

*   **Compact:** Optimized for displaying more information within a given screen area. Reduces padding, margins, and potentially font sizes.
*   **Balanced (Default):** The current standard density, offering a good balance between information density and readability.
*   **Expanded:** Prioritizes readability and visual spaciousness. Increases padding, margins, and potentially font sizes.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled by a set of CSS variables, allowing for dynamic adjustments without modifying core component styles. These variables should be defined in `public/shared/lifeos-dashboard-tokens.css` or a dedicated `lifeos-dashboard-density.css` file.

### Core Density Variables:

| Variable Name                 | Purpose                                     | Compact Value (Example) | Balanced Value (Example) | Expanded Value (Example) |
| :---------------------------- | :------------------------------------------ | :---------------------- | :----------------------- | :----------------------- |
| `--dash-card-padding-x`       | Horizontal padding for `.card`              | `16px`                  | `20px`                   | `24px`                   |
| `--dash-card-padding-y`       | Vertical padding for `.card`                | `16px`                  | `20px`                   | `24px`                   |
| `--dash-card-label-font-size` | Font size for `.card-label`                 | `9px`                   | `10px`                   | `11px`                   |
| `--dash-card-label-margin-b`  | Bottom margin for `.card-label`             | `10px`                  | `14px`                   | `18px`                   |
| `--dash-item-spacing-sm`      | Small spacing for list items (e.g., MITs)   | `8px`                   | `10px`                   | `12px`                   |
| `--dash-item-spacing-md`      | Medium spacing for list items (e.g., Events)| `8px`                   | `9px`                    | `11px`                   |
| `--dash-card-radius`          | Border radius for `.card`                   | `var(--dash-radius-md)` | `var(--dash-radius-lg)`  | `var(--dash-radius-xl)`  |

### Implementation Notes for CSS:

*   The existing `.card` and related styles in `public/overlay/lifeos-dashboard.html` (or external CSS) will be updated to use these new density variables.
*   A `[data-card-density="compact"]` or `[data-card-density="expanded"]` selector on the `body` or a main container will override the default (`balanced`) values of these variables.

## 3. DOM Data Attributes

The active density mode will be indicated by a `data-card-density` attribute on the `<body>` element of `public/overlay/lifeos-dashboard.html`.

Example:
*   `<body data-card-density="compact">`
*   `<body data-card-density="balanced">`
*   `<body data-card-density="expanded">`

This attribute will be set dynamically by JavaScript based on user preferences.

## 4. Mobile Constraints

On mobile viewports (e.g., `max-width: 640px`), the density modes will be constrained to ensure optimal usability and readability.

*   **Default Mobile Density:** Regardless of the user's chosen desktop density, mobile views will default to a `balanced` or `compact` equivalent. The `expanded` mode will likely be visually indistinguishable from `balanced` on small screens to prevent excessive scrolling or empty space.
*   **Responsive Overrides:** Media queries will be used to adjust the density CSS variables for mobile, ensuring that padding, font sizes, and spacing remain appropriate for smaller screens. For example, `--dash-card-padding-x` might be capped at `16px` for all modes on mobile.
*   **User Preference Persistence:** The user's chosen density preference will persist, but its visual application will be responsive to the viewport size.

## 5. Intersecting with Customization State

The user's preferred dashboard card density will be stored as part of their customization state.

*   **Storage Mechanism:** Given the absence of `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`, it is assumed that this preference will be stored in `localStorage` under a key like `lifeos_dashboard_density` (e.g., `localStorage.setItem('lifeos_dashboard_density', 'compact')`). For persistent, cross-device settings, a backend API endpoint would be used to store this in the user's profile.
*   **Loading State:** On `DOMContentLoaded` in `public/overlay/lifeos-dashboard.html`, JavaScript (e.g., within `lifeos-bootstrap.js` or the main `<script type="module">` block) will read the `lifeos_dashboard_density` value from `localStorage`.
*   **Applying State:** The retrieved density value will then be applied to the `<body>` element as the `data-card-density` attribute. If no preference is found, `balanced` will be used as the default.
*   **User Interface:** A UI control (e.g., a button group or dropdown in the dashboard header) will be added to allow users to select their preferred density mode, which will update both the `data-card-density` attribute and the stored preference.

## 6. Rollout Order

1.  **Define CSS Variables:** Add the new density-specific CSS variables and their default (`balanced`) values to `public/shared/lifeos-dashboard-tokens.css`.
2.  **Implement Density Overrides:** Add CSS rules for `[data-card-density="compact"]` and `[data-card-density="expanded"]` in `public/shared/lifeos-dashboard-tokens.css` (or a new `lifeos-dashboard-density.css` file) to adjust the density variables.
3.  **Update Component Styles:** Modify existing CSS classes (e.g., `.card`, `.card-label`, `.mit-item`, `.event-row`, `.score-tile`) in `public/overlay/lifeos-dashboard.html`'s `<style>` block or `lifeos-dashboard-tokens.css` to utilize the new density variables.
4.  **Add Mobile Responsiveness:** Integrate media queries to adjust density variables for mobile viewports, ensuring a consistent and usable experience across devices.
5.  **Implement JavaScript Logic:** Add JavaScript to `public/overlay/lifeos-dashboard.html` (within the existing `<script type="module">` block) to:
    *   Read `lifeos_dashboard_density` from `localStorage` on load.
    *   Apply the `data-card-density` attribute to the `<body>`.
    *   Provide a function (e.g., `setCardDensity(mode)`) to update the attribute and `localStorage`.
6.  **Develop UI Control:** Create a UI element (e.g., a button in the header) that allows users to switch between density modes, calling the `setCardDensity` function.
7.  **Testing:** Thoroughly test all density modes across various screen sizes and devices.