<!-- SYNOPSIS: BuilderOS Remediation: AMENDMENT_12_COMMAND_CENTER - TODO-20-G7 (Responsive Layout Breakpoints) -->

The blueprint `AMENDMENT_12_COMMAND_CENTER.md` is incomplete regarding specific screen breakpoint definitions.

```markdown
# BuilderOS Remediation: AMENDMENT_12_COMMAND_CENTER - TODO-20-G7 (Responsive Layout Breakpoints)

This memo addresses the blocking task: "Mobile-responsive layout not yet designed — screen breakpoints not defined." It provides a builder-ready enhancement for defining the foundational responsive breakpoints.

## 1. Blocking Ambiguity / Founder Decision List

The following specific pixel values for screen breakpoints require founder decision or confirmation to proceed with responsive layout implementation:

*   **Small (Mobile):** Max-width for mobile devices. (e.g., `576px`, `640px`)
*   **Medium (Tablet):** Min-width for tablets and larger phones. (e.g., `768px`, `820px`)
*   **Large (Desktop):** Min-width for standard desktop screens. (e.g., `992px`, `1024px`)
*   **Extra Large (Widescreen):** Optional min-width for very large displays. (e.g., `1200px`, `1440px`)

## 2. Already-Settled Constraints

*   The Command Center UI must be fully mobile-responsive across common device sizes.
*   A "mobile-first" approach will be adopted where base styles target small screens, and larger screen styles are applied via `min-width` media queries.
*   Existing CSS utility patterns (e.g., CSS variables, utility classes) should be leveraged for breakpoint definitions.

## 3. Smallest Buildable Next Slice

Define the core responsive breakpoints as CSS custom properties (variables) and/or SCSS variables, making them globally accessible for media queries. This slice does not involve layout changes, only the definition of the breakpoints themselves.

Example:
```css
:root {
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
}
```

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/styles/variables.css` (or equivalent global CSS variables file)
*   `src/styles/_breakpoints.scss` (if using SCSS for variable definitions)
*   `docs/projects/builderos-remediation/amendment-12-command-center-todo-20-g7.md` (this file, for completion)

## 5. Required Verifier/Runtime Checks

*   Verify that the defined CSS variables (e.g., `--breakpoint-sm`) are accessible in the browser's developer tools.
*   Confirm that these variables can be successfully used within media queries in other CSS files (e.g., `@media (min-width: var(--breakpoint-md))`).
*   No visual changes are expected at this stage, only the presence and accessibility of the variables.

## 6. Stop Conditions

This slice is complete when:

*   Specific pixel values for `sm`, `md`, `lg`, and optionally `xl` breakpoints are defined and committed.
*   These breakpoints are declared as global CSS custom properties or SCSS variables.
*   The variables are confirmed to be accessible for use in media queries.
```