The task requests a Markdown specification, but the final instruction block demands a complete HTML file. Prioritizing the explicit task wording, this output is a Markdown specification.

# LifeOS Dashboard Card Density Specification

This document outlines the specification for implementing adjustable display density modes for dashboard cards within the LifeOS platform. It defines the available density modes, their mapping to CSS variables and DOM attributes, considerations for mobile devices, and integration with the existing dashboard customization state.

## 1. Density Modes

The LifeOS Dashboard will support three distinct display density modes, as defined in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md` under the "Density enum" section:

-   **`comfortable` (Default)**: Represents the current, balanced spacing and layout. This mode prioritizes readability and visual breathing room.
-   **`compact`**: A mode designed to maximize information density. It will feature reduced padding, margins, and potentially smaller font sizes to fit more content on screen, particularly useful for users who prefer a denser information display.
-   **`spacious`**: A mode offering an enhanced, relaxed visual experience. It will utilize increased padding, margins, and potentially slightly larger font sizes, providing more whitespace around elements.

## 2. Technical Implementation

### 2.1. DOM Integration

The active density mode will be applied to the `<body>` element of `public/overlay/lifeos-dashboard.html` using a `data-density` attribute. This allows for CSS rules to conditionally apply styles based on the selected mode.

**Example:**
-   Default: `<body data-density="comfortable">`
-   Compact: `<body data-density="compact">`
-   Spacious: `<body data-density="spacious">`

### 2.2. CSS Variable Mapping

Density adjustments will be managed through a set of new CSS variables defined within the `:root` scope, and then overridden within `body[data-density="<mode>"]` selectors. This approach leverages the existing CSS variable pattern found in `public/shared/lifeos-dashboard-tokens.css` and the `<style>` block of `public/overlay/lifeos-dashboard.html`.

**Proposed CSS Variables (examples):**

| Variable Name             | Purpose                                     | `comfortable` (Default) | `compact` | `spacious` |
| :------------------------ | :------------------------------------------ | :---------------------- | :-------- | :--------- |
| `--dash-card-padding`     | Internal padding for `.card` elements       | `20px`                  | `12px`    | `28px`     |
| `--dash-card-label-mb`    | Margin-bottom for `.card-label`             | `14px`                  | `8px`     | `20px`     |
| `--dash-item-padding-y`   | Vertical padding for list items (e.g., MITs, events) | `10px`                  | `6px`     | `14px`     |
| `--dash-item-gap`         | Gap between items in lists (e.g., MITs, events) | `12px`                  | `8px`     | `16px`     |
| `--dash-grid-gap`         | Gap in grid layouts (e.g., `.scores-grid`)  | `12px`                  | `8px`     | `20px`     |
| `--dash-msg-gap`          | Gap between chat messages                   | `8px`                   | `4px`     | `12px`     |
| `--dash-font-size-base`   | Base font size for primary content          | `15px`                  | `14px`    | `16px`     |
| `--dash-font-size-sm`     | Small font size (e.g., event titles)        | `14px`                  | `13px`    | `15px`     |
| `--dash-font-size-xs`     | Extra small font size (e.g., muted text)    | `12px`                  | `11px`    | `13px`     |

**Integration Example (within `public/overlay/lifeos-dashboard.html` or `public/shared/lifeos-dashboard-tokens.css`):**

```css
/* Base variables for comfortable mode (default) */
:root {
  --dash-card-padding: 20px;
  --dash-card-label-mb: 14px;
  --dash-item-padding-y: 10px;
  --dash-item-gap: 12px;
  --dash-grid-gap: 12px;
  --dash-msg-gap: 8px;
  --dash-font-size-base: 15px;
  --dash-font-size-sm: 14px;
  --dash-font-size-xs: 12px;
}

/* Compact mode overrides */
body[data-density="compact"] {
  --dash-card-padding: 12px;
  --dash-card-label-mb: 8px;
  --dash-item-padding-y: 6px;
  --dash-item-gap: 8px;
  --dash-grid-gap: 8px;
  --dash-msg-gap: 4px;
  --dash-font-size-base: 14px;
  --dash-font-size-sm: 13px;
  --dash-font-size-xs: 11px;
}

/* Spacious mode overrides */
body[data-density="spacious"] {
  --dash-card-padding: 28px;
  --dash-card-label-mb: 20px;
  --dash-item-padding-y: 14px;
  --dash-item-gap: 16px;
  --dash-grid-gap: 20px;
  --dash-msg-gap: 12px;
  --dash-font-size-base: 16px;
  --dash-font-size-sm: 15px;
  --dash-font-size-xs: 13px;
}

/* Existing CSS rules would then use these variables */
.card {
  padding: var(--dash-card-padding);
}
.card-label {
  margin-bottom: var(--dash-card-label-mb);
}
.mit-item {
  padding: var(--dash-item-padding-y) 0;
  gap: var(--dash-item-gap);
}
/* ... and so on for other elements ... */
```

## 3. Mobile Constraints

The density modes must be responsive and consider mobile device limitations.

-   **Default Behavior:** On smaller screens (e.g., below `640px` breakpoint), the `comfortable` or `compact` mode should be the default, regardless of user preference, to ensure optimal readability and usability.
-   **Spacious Mode on Mobile:** The `spacious` mode may be automatically disabled or visually constrained on mobile devices to prevent excessive scrolling or poor layout.
-   **Viewport Settings:** The existing `meta name="viewport"` settings (`width=device-width, initial-scale=1.0, viewport-fit=cover`) and `env(safe-area-inset-bottom)` in `body` padding should be respected and integrated with density adjustments to ensure safe areas are accounted for.
-   **Media Queries:** Existing media queries (e.g., `min-width: 640px`, `min-width: 1000px` in `lifeos-dashboard.html`) should be reviewed to ensure they complement, rather than conflict with, the density mode adjustments. It may be necessary to apply density variables *within* these media queries for fine-grained control.

## 4. Intersection with Customization State

The selected density mode will be persisted and retrieved using the `lifeos_dashboard_layout` key in `localStorage`, as defined in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`.

-   **Storage Key:** `lifeos_dashboard_layout`
-   **Field:** The `density` field within the JSON object will store the current mode (`"comfortable"`, `"compact"`, or `"spacious"`).
-   **Client-Side Logic:**
    1.  On `DOMContentLoaded` in `public/overlay/lifeos-dashboard.html`, JavaScript will read the `lifeos_dashboard_layout` object from `localStorage`.
    2.  If the `density` field is present and valid, its value will be used to set the `data-density` attribute on the `<body>` element.
    3.  If `lifeos_dashboard_layout` is missing or the `density` field is invalid, `comfortable` will be used as the fallback default.
    4.  Any UI control for changing density will update this `localStorage` value and immediately apply the `data-density` attribute.

## 5. Rollout Order

The implementation and rollout of dashboard density modes should follow a phased approach:

1.  **Phase 1: Core Implementation (Internal)**
    *   Define and implement the core CSS variables and `data-density` attribute logic.
    *   Update existing CSS rules to utilize these new variables.
    *   Implement client-side JavaScript to read/write the `density` state from `localStorage` and apply the `data-density` attribute.
    *   Default to `comfortable` mode.
2.  **Phase 2: Compact Mode Introduction**
    *   Introduce the `compact` mode as an optional setting.
    *   Develop a simple UI control (e.g., a button or dropdown in settings) to allow users to switch between `comfortable` and `compact`.
3.  **Phase 3: Spacious Mode Introduction**
    *   Introduce the `spacious` mode as an optional setting.
    *   Update the UI control to include `spacious` as an option.
4.  **Phase 4: Refinement & Mobile Optimization**
    *   Thoroughly test all density modes across various screen sizes and devices.
    *   Refine CSS variables and media queries to ensure optimal presentation on mobile.
    *   Address any "flash of unstyled content" or layout shifts during page load.