<!-- SYNOPSIS: LifeOS Dashboard Shell Accessibility Specification -->

# LifeOS Dashboard Shell Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on core interactive elements and user experience. Adherence to these guidelines ensures a robust and inclusive interface for all users, aligning with WCAG principles.

## 1. Focus Management and Traps (WCAG 2.1.2 No Keyboard Trap, 2.4.3 Focus Order, 2.4.7 Focus Visible)

### 1.1 Keyboard Operability
All interactive elements within the dashboard shell (buttons, input fields, custom controls like MIT items, score tiles, chat input, and header controls) must be fully operable via keyboard alone. This includes activation, navigation, and data entry.

### 1.2 Logical Focus Order
The keyboard focus order must be logical and intuitive, following the visual flow of the page. Users tabbing through the interface should experience a predictable sequence that matches the content's reading order.

### 1.3 Visible Focus Indicator
A clear and distinct visual focus indicator must be present for all interactive elements when they receive keyboard focus. This indicator must meet minimum contrast requirements (WCAG 1.4.11 Non-text Contrast) against adjacent colors to be easily perceivable.

### 1.4 Focus Traps
When modal dialogs or other temporary UI elements (e.g., tooltips that require interaction, future pop-ups) are introduced, keyboard focus must be programmatically contained within that element until it is dismissed. Users must be able to easily dismiss such elements (e.g., via the `Escape` key) and have focus return to the element that triggered the temporary UI or a logical previous position.

## 2. Semantic Structure and Landmarks (WCAG 1.3.1 Info and Relationships)

### 2.1 ARIA Landmark Roles
The dashboard shell must utilize appropriate ARIA landmark roles to define distinct and navigable sections of the page. This enables assistive technologies to provide direct navigation to major content blocks.
- The main header (`<header>`) should be assigned `role="banner"`.
- The primary content area (`<div class="page">` containing the main dashboard widgets) should be assigned `role="main"`.
- The AI rail (`<div id="lifeos-ai-rail-root">`) should be assigned `role="complementary"` or `role="aside"` if it contains related but separate content.
- Navigation elements (if any are added beyond the header controls) should use `role="navigation"`.

### 2.2 Semantic HTML
Utilize semantic HTML5 elements (e.g., `<header>`, `<main>`, `<nav>`, `<button>`, `<input>`, `<ul>`, `<li>`) where appropriate to convey structure and meaning to assistive technologies. Custom interactive components must have appropriate ARIA roles and properties (e.g., `role="button"`, `aria-pressed`, `aria-label`) to communicate their purpose and state.

## 3. Contrast Requirements (WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)

### 3.1 Text Contrast
All text and images of text must have a contrast ratio of at least 4.5:1 against their background. For large text (18pt or 14pt bold and larger), a contrast ratio of at least 3:1 is acceptable. This applies to all states, including hover and focus.

### 3.2 Non-text Contrast
Graphical objects that are essential for understanding content or functionality (e.g., icons, input borders, focus indicators, progress bar fills) must have a contrast ratio of at least 3:1 against adjacent colors. This ensures that interactive elements and their states are clearly distinguishable.

## 4. Motion and Animation (WCAG 2.3.3 Animation from Interactions)

### 4.1 Respect `prefers-reduced-motion`
The dashboard shell must respect the user's `prefers-reduced-motion` media query setting. When this setting is active, animations and transitions should be significantly reduced or removed entirely to prevent discomfort or distraction for users sensitive to motion.

### 4.2 Animation Alternatives
For users who prefer reduced motion, the following animations should be handled gracefully:
- `pulse-ring`: Should be replaced with a static state or a subtle, non-pulsing indicator.
- `fadeUp`: Should be replaced with instant appearance or a very fast, non-animated transition.
- `shimmer`: Should be replaced with a static background or a simple fade.
- `bounce-dot`: Should be replaced with static dots or a simple fade effect.
- `ring-fill`, `bar-grow`, `check-draw`, `mic-pulse`: Should be replaced with instant state changes or very fast, non-animated transitions.

### 4.3 User Control
Where complex animations are deemed essential, provide user controls to pause, stop, or hide them.