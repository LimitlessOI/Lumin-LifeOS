The task asks for a specification in Markdown, but the output contract demands a full HTML file as implementation code, and explicitly states "No HTML rewrite" in the task itself. This is a direct contradiction regarding the output format and content.
# Dashboard Card Density Specification

This document outlines the implementation details for supporting multiple card density modes on the LifeOS Dashboard.

## 1. Density Modes

Three primary density modes will be supported, affecting the visual spacing and sizing of elements within dashboard cards:

-   **Compact:** Maximizes information density by reducing padding, margins, and font sizes. Ideal for users who want to see more data at a glance.
-   **Balanced (Default):** Provides a comfortable and readable experience with moderate spacing. This will be the initial default mode.
-   **Expanded:** Prioritizes readability and larger touch targets with increased padding, margins, and slightly larger font sizes. Beneficial for users with visual impairments or those preferring a more spacious layout.

## 2. Technical Implementation

### 2.1. CSS Variable Mapping

Density modes will be controlled via a `data-density` attribute on the `<html>` element. CSS variables will be defined in `public/shared/lifeos-dashboard-tokens.css` to adjust spacing, font sizes, and potentially other visual properties based on this attribute.

**Example CSS Structure (to be added to `lifeos-dashboard-tokens.css`):**

```css
:root {
  /* Default (Balanced) Density Variables */
  --dash-card-padding: 20px;
  --dash-card-label-margin-bottom: 14px;
  --dash-mit-item-padding: 10px 0;
  --dash-mit-text-font-size: 15px;
  --dash-event-row-padding: 9px 0;
  --dash-event-time-font-size: 12px;
  --dash-event-title-font-size: 14px;
  --dash-goal-name-font-size: 14px;
  --dash-goal-pct-font-size: 13px;
  --dash-goal-sub-font-size: 11px;
  --dash-score-tile-padding: 16px;
  --dash-score-num-font-size: 20px;
  --dash-score-label-font-size: 11px;
  --dash-chat-msg-padding: 10px 14px;
  --dash-chat-msg-font-size: 14px;
  --dash-chat-input-padding: 10px 14px;
}

/* Compact Density */
html[data-density="compact"] {
  --dash-card-padding: 14px;
  --dash-card-label-margin-bottom: 10px;
  --dash-mit-item-padding: 8px 0;
  --dash-mit-text-font-size: 14px;
  --dash-event-row-padding: 7px 0;
  --dash-event-time-font-size: 11px;
  --dash-event-title-font-size: 13px;
  --dash-goal-name-font-size: 13px;
  --dash-goal-pct-font-size: 12px;
  --dash-goal-sub-font-size: 10px;
  --dash-score-tile-padding: 12px;
  --dash-score-num-font-size: 18px;
  --dash-score-label-font-size: 10px;
  --dash-chat-msg-padding: 8px 12px;
  --dash-chat-msg-font-size: 13px;
  --dash-chat-input-padding: 8px 12px;
}

/* Expanded Density */
html[data-density="expanded"] {
  --dash-card-padding: 28px;
  --dash-card-label-margin-bottom: 18px;
  --dash-mit-item-padding: 12px 0;
  --dash-mit-text-font-size: 16px;
  --dash-event-row-padding: 11px 0;
  --dash-event-time-font-size: 13px;
  --dash-event-title-font-size: 15px;
  --dash-goal-name-font-size: 15px;
  --dash-goal-pct-font-size: 14px;
  --dash-goal-sub-font-size: 12px;
  --dash-score-tile-padding: 20px;
  --dash-score-num-font-size: 22px;
  --dash-score-label-font-size: 12px;
  --dash-chat-msg-padding: 12px 16px;
  --dash-chat-msg-font-size: 15px;
  --dash-chat-input-padding: 12px 16px;
}
```

Existing CSS rules in `public/overlay/lifeos-dashboard.html` will be updated to use these new `--dash-*` variables. For example:

```css
/* Before */
.card {
  padding: 20px;
}
/* After */
.card {
  padding: var(--dash-card-padding);
}
```
This applies to all relevant elements like `.card-label`, `.mit-item`, `.mit-text`, `.event-row`, `.event-time`, `.event-title`, `.goal-name`, `.goal-pct`, `.goal-sub`, `.score-tile`, `.score-num`, `.score-label`, `.msg`, `.chat-row input`.

### 2.2. DOM Data Attributes

The `<html>` element will carry a `data-density` attribute.
-   `data-density="compact"`
-   `data-density="balanced"`
-   `data-density="expanded"`

This attribute will be dynamically updated by JavaScript based on user preference.

### 2.3. Mobile Constraints

-   **Responsive Scaling:** The CSS variables will be designed to scale appropriately on smaller screens. Media queries in `lifeos-dashboard-tokens.css` or `lifeos-dashboard.html` can override density-specific variables for mobile if needed, ensuring touch targets remain accessible and content doesn't become unreadable.
-   **Default Behavior:** On mobile devices, the default density might lean towards "Balanced" or "Compact" to optimize screen real estate, even if the user's desktop preference is "Expanded". This can be implemented by checking `window.innerWidth` in the JavaScript logic.
-   **Minimum Sizes:** Interactive elements (buttons, checkboxes, input fields) will maintain a minimum effective size (e.g., 44x44px) regardless of density settings to ensure usability on touch devices. This will be enforced by base styles or specific overrides.

### 2.4. Customization State Integration

The selected density mode will be stored in `localStorage` under the key `lifeos_dashboard_density`.

**Initialization Logic (to be added to `public/overlay/lifeos-dashboard.html` script):**

1.  On `DOMContentLoaded`, retrieve `lifeos_dashboard_density` from `localStorage`.
2.  If a value exists (`"compact"`, `"balanced"`, or `"expanded"`), apply it to `document.documentElement.dataset.density`.
3.  If no value exists, default to `"balanced"` and save this to `localStorage`.
4.  A new button will be added to the `.hdr-controls` section of `public/overlay/lifeos-dashboard.html`. This button will cycle through the density modes (`Balanced` -> `Compact` -> `Expanded` -> `Balanced`).
5.  Clicking this button will:
    -   Update `document.documentElement.dataset.density`.
    -   Update `localStorage.setItem('lifeos_dashboard_density', newMode)`.
    -   Visually update the button (e.g., change icon or text) to reflect the current mode.

## 3. Rollout Order

1.  **CSS Variable Definition:** Add new density-specific CSS variables to `public/shared/lifeos-dashboard-tokens.css` as outlined in Section 2.1.
2.  **HTML CSS Update:** Modify existing CSS rules in the `<style>` block of `public/overlay/lifeos-dashboard.html` to utilize the new `--dash-*` CSS variables for spacing and sizing.
3.  **UI Control Addition:** Add a new button to the `.hdr-controls` section in `public/overlay/lifeos-dashboard.html` to toggle density modes.
4.  **JavaScript Logic:** Implement the `toggleDensity()` function and `DOMContentLoaded` initialization logic in the main script block of `public/overlay/lifeos-dashboard.html` to manage the `data-density` attribute and `localStorage` persistence.
5.  **Mobile Responsiveness Review:** Test and refine density settings on various mobile devices to ensure optimal usability and address any specific mobile constraints.