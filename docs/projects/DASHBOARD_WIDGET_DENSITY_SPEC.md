The instruction to generate 'implementation code' was interpreted as generating the Markdown specification as requested by the subsequent instruction 'Markdown: modes, token mapping, rollout order.'

# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes, including their mapping to CSS variables and DOM data attributes, mobile constraints, and integration with the dashboard customization state.

## 1. Density Modes

Three primary density modes are defined to cater to different user preferences and screen sizes:

-   **Compact:** Maximizes information density by reducing padding, margins, and font sizes. Ideal for users who want to see more data at a glance, especially on larger screens, or for mobile views where space is at a premium.
-   **Balanced (Default):** Provides a comfortable reading experience with moderate spacing and font sizes. This is the standard mode and offers a good balance between information density and readability.
-   **Expanded:** Prioritizes readability and visual separation with increased padding, margins, and potentially larger font sizes. Suitable for users who prefer a more spacious layout or have visual accessibility needs.

## 2. Token Mapping (CSS Variables)

Density modes will be controlled by a set of CSS variables, building upon the existing `--dash-space-unit` defined in `public/shared/lifeos-dashboard-tokens.css`. These variables will be scoped to the dashboard container via a `data-density` attribute.

### Base Variables (to be defined in `public/shared/lifeos-dashboard-tokens.css` or a new density-specific CSS file):

```css
/* Example additions for density control */
:root {
  /* Base spacing unit from existing tokens */
  --dash-space-unit: 8px;

  /* Card-specific spacing and sizing */
  --dash-card-padding-x: calc(var(--dash-space-unit) * 2); /* Default: 16px */
  --dash-card-padding-y: calc(var(--dash-space-unit) * 2); /* Default: 16px */
  --dash-card-gap: calc(var(--dash-space-unit) * 2); /* Default: 16px between elements */
  --dash-card-font-size-base: 1rem; /* Default font size */
  --dash-card-font-size-sm: 0.875rem; /* Smaller font size */
  --dash-card-font-size-lg: 1.125rem; /* Larger font size */