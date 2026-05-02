The task requests a specification document with no HTML rewrite, but the output contract demands a complete HTML document. Prioritizing the task's explicit content requirement for a specification.

# LifeOS Dashboard Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on key WCAG principles to ensure an inclusive user experience. This is a specification for future implementation and does not involve immediate HTML modifications.

## 1. Focus Management and Keyboard Navigation (WCAG 2.1.1, 2.1.2, 2.4.3)

### 1.1 Keyboard Operability
All interactive elements within the dashboard shell (e.g., buttons, input fields, clickable cards, MIT items) must be operable through a keyboard interface without requiring specific timings for individual keystrokes. This includes:
-   **Tab Order:** The logical tab order (`tabindex`) must follow the visual flow of the page, ensuring a predictable and intuitive navigation path.
-   **Focus Indicator:** A clear and visible focus indicator must be present for all interactive elements when they receive keyboard focus. The current `:focus` styles should be reviewed for sufficient contrast and prominence.
-   **Activation:** All interactive elements must be activatable using standard keyboard commands (e.g., `Enter` for buttons/links, `Space` for checkboxes/toggles).

### 1.2 Focus Traps
Users must not be trapped within any specific interactive component or region of the dashboard. If a modal or custom widget is introduced, keyboard focus must be manageable within it and allow for easy escape (e.g., via `Escape` key) back to the previous focus point.

## 2. Semantic Structure and Landmarks (WCAG 1.3.1)

### 2.1 HTML5 Semantic Elements
The dashboard shell should leverage HTML5 semantic elements to define distinct regions of the page, aiding navigation for screen reader users and improving document outline.
-   The main content area (`.page` div) should be wrapped in a `<main>` element.
-   The header section (`.hdr-row`) is appropriately within a `<header>` element.
-   Consider if any sections (e.g., MITs, Calendar, Goals, Chat) could benefit from `<section>` or `<aside>` elements with appropriate `aria-label` attributes if their purpose isn't immediately clear from context.
-   Ensure proper heading structure (`<h1>` to `<h6>`) is used to convey content hierarchy. The current `greeting` element could be an `<h1>`.

### 2.2 ARIA Landmarks
For areas where semantic HTML5 elements are not sufficient or clear, ARIA landmark roles (e.g., `role="navigation"`, `role="complementary"`, `role="contentinfo"`) should be applied to provide additional structural information to assistive technologies.

## 3. Color Contrast (WCAG 1.4.3, 1.4.11)

### 3.1 Text Contrast
All text content, including placeholder text in input fields, must have a contrast ratio of at least 4.5:1 against its background. This applies to:
-   Primary text (`--text-primary`)
-   Secondary text (`--text-secondary`)
-   Muted text (`--text-muted`)
-   Text within buttons and labels.

### 3.2 Non-Text Contrast
Graphical objects and user interface components (e.g., input borders, focus indicators, icons, score rings, checkboxes) must have a contrast ratio of at least 3:1 against adjacent colors. This ensures interactive elements and essential graphics are perceivable.

## 4. Motion and Animation (WCAG 2.3.3)

### 4.1 Respect for `prefers-reduced-motion`
The dashboard must respect the user's `prefers-reduced-motion` media query setting.
-   When `prefers-reduced-motion: reduce` is active, non-essential animations (e.g., `fadeUp`, `pulse-dot`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, `mic-pulse`) should be minimized or removed.
-   Essential animations that convey status or provide critical feedback may be retained but should be simplified (e.g., fades instead of complex movements).
-   The `pulse-dot` in the greeting and `mic-pulse` for the listening state are candidates for reduction or removal under this preference.