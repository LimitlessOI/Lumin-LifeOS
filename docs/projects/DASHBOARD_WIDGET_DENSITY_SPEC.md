The output format for this task (Markdown for a specification) contradicts the general "HTML FULL FILE — STRICT OUTPUT CONTRACT" for code generation. Proceeding with Markdown as explicitly requested for the specification.

### Specification: Dashboard Card Density Modes

This document outlines the specification for implementing dashboard card density modes, including their mapping to CSS variables and DOM data attributes, mobile constraints, and integration with the customization state.

#### 1. Density Modes

Three primary density modes are defined for dashboard cards:

*   **Compact**: Maximizes information density, reducing whitespace and element sizes.
*   **Balanced**: The default, providing a comfortable reading experience with moderate spacing.
*   **Expanded**: Increases whitespace and element sizes for a more relaxed, spacious layout.

#### 2. Token Mapping to CSS Variables

Density modes will be controlled by a set of new CSS variables, which will override or adjust existing spacing, padding, and radius tokens. These variables will be defined at the `:root` level and dynamically updated based on the active density mode.

**Proposed New CSS Variables:**

| Variable Name                     | Description                                     | Compact (Mobile/Desktop) | Balanced (Mobile/Desktop) | Expanded (Mobile/Desktop) |
| :-------------------------------- | :---------------------------------------------- | :----------------------- | :------------------------ | :------------------------ |
| `--lifeos-density-card-padding`   | Inner padding for `.card` elements              | 12px / 20px              | 20px / 28px               | 28px / 36px               |
| `--lifeos-density-card-label-mb`  | `margin-bottom` for `.card-label`               | 8px / 12px               | 14px / 18px               | 20px / 24px               |
| `--lifeos-density-card-radius`    | `border-radius` for `.card` elements            | var(--radius-md)         | var(--radius-lg)          | var(--radius-xl)          |
| `--lifeos-density-grid-gap`       | `gap` for `.two-col` grid layouts               | 8px / 16px               | 16px / 32px               | 24px / 48px               |
| `--lifeos-density-item-padding-y` | Vertical padding for list items (e.g., `.mit-item`, `.event-row`) | 6px                      | 10px                      | 14px                      |
| `--lifeos-density-item-gap`       | Gap for list items (e.g., `.mit-item`, `.event-row`) | 8px                      | 12px                      | 16px                      |
| `--lifeos-density-font-size-sm`   | Smaller font sizes (e.g., `.card-label`, `.event-time`) | 9px                      | 10px                      | 11px                      |
| `--lifeos-density-font-size-md`   | Medium font sizes (e.g., `.mit-text`, `.event-title`) | 13px                     | 15px                      | 17px                      |

*Note: Mobile values apply up to `min-width: 640px`. Desktop values apply from `min-width: 1000px`. Intermediate breakpoints will inherit or be explicitly defined if needed.*

#### 3. DOM Data Attributes

The active density mode will be controlled by a `data-density` attribute on the `<html>` element. This attribute will accept one of three string values: `compact`, `balanced`, or `expanded`.

**Example:**
`<html lang="en" data-theme="dark" data-density="balanced">`

CSS rules will then target this attribute to apply the appropriate variable values:

```css
html[data-density="compact"] {
  --lifeos-density-card-padding: 12px;
  /* ... other compact variables ... */
}
html[data-density="balanced"] {
  --lifeos-density-card-padding: 20px;
  /* ... other balanced variables ... */
}
html[data-density="expanded"] {
  --lifeos-density-card-padding: 28px;
  /* ... other expanded variables ... */
}

@media (min-width: 1000px) {
  html[data-density="compact"] {
    --lifeos-density-card-padding: 20px;
    /* ... desktop compact variables ... */
  }
  /* ... similar for balanced and expanded desktop ... */
}
```

#### 4. Mobile Constraints

On mobile devices (screen width less than `640px`), the density modes will still apply, but with potentially reduced impact to ensure core usability and readability. The proposed values in Section 2 account for mobile-specific adjustments. For instance, the difference in padding between modes might be smaller on mobile than on desktop to prevent elements from becoming too cramped or too sparse on small screens. The "Balanced" mode will serve as the default and recommended setting for most mobile users.

#### 5. Intersection with Customization State Document

The user's preferred density setting will be stored as part of their dashboard customization state. This will be a single string value corresponding to the `data-density` attribute: `compact`, `balanced`, or `expanded`.

**Storage Mechanism:**
The density setting will be persisted in `localStorage` under a key such as `lifeos_dashboard_density`. Upon dashboard load, this value will be read and applied to the `<html>` element's `data-density` attribute.

**Example Customization State (conceptual):**
```json
{
  "theme": "dark",
  "dashboardDensity": "balanced",
  "widgetOrder": ["mit", "calendar", "scores", "goals", "chat"]
}
```

#### 6. Rollout Order

The implementation of dashboard density will follow these steps:

1.  **Define Core CSS Variables**: Introduce the new `--lifeos-density-*` CSS variables in `public/shared/lifeos-dashboard-tokens.css` with default values for `balanced` mode.
2.  **Refactor Existing CSS**: Update `public/overlay/lifeos-dashboard.html`'s `<style>` block to use the new `--lifeos-density-*` variables instead of hardcoded values for padding, margins, and radii where applicable.
3.  **Implement `data-density` CSS Rules**: Add CSS rules to `public/shared/lifeos-dashboard-tokens.css` (or a new dedicated density CSS file if scope expands) that adjust the `--lifeos-density-*` variables based on the `html[data-density]` attribute.
4.  **JavaScript Logic for Persistence and Application**:
    *   Add logic to `public/overlay/lifeos-dashboard.html`'s `<script type="module">` block to read `localStorage.getItem('lifeos_dashboard_density')` on `DOMContentLoaded`.
    *   Apply the retrieved value to `document.documentElement.dataset.density`. If no value is found, default to `balanced`.
    *   Implement a function `setDashboardDensity(mode)` that updates `document.documentElement.dataset.density` and `localStorage`.
5.  **UI Control (Future Task)**: Integrate a UI element (e.g., a button or dropdown in the header controls) that allows users to select their preferred density mode, calling `setDashboardDensity()`.