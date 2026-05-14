# LifeOS Dashboard Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on key WCAG principles to ensure an inclusive user experience.

## 1. Focus Traps

**WCAG Principle:** Operable (2.1 Keyboard Accessible, 2.4 Navigable)

**Requirement:**
When modal dialogs, overlays, or other temporary UI elements are activated, keyboard focus must be programmatically managed to remain within that active component until it is explicitly dismissed. Users must not be able to tab out to underlying content. Upon dismissal, focus should return to the element that triggered the component.

**Implementation Notes:**
- Identify all components that temporarily take over the user's interaction flow (e.g., future settings modals, confirmation dialogs).
- Implement JavaScript to capture and release focus using techniques like `aria-modal="true"` and managing `tabindex` on the underlying document.

## 2. Landmarks

**WCAG Principle:** Navigable (2.4.1 Bypass Blocks, 2.4.6 Headings and Labels, 1.3.1 Info and Relationships)

**Requirement:**
The dashboard shell must utilize appropriate ARIA landmark roles or native HTML5 semantic elements to define distinct regions of the page. This enables users of assistive technologies to quickly understand the page structure and navigate efficiently between major content areas.

**Implementation Notes:**
- The main header (`<header>`) should be identified as `role="banner"`.
- The primary content area (`<div class="page">`) should be identified as `role="main"` or use the `<main>` HTML5 element.
- The AI chat section, if considered a distinct and secondary content block, could be identified as `role="complementary"` or use an `<aside>` element.
- The AI rail (`#lifeos-ai-rail-root`) should also be identified as `role="complementary"` or use an `<aside>` element.
- Ensure all interactive navigation elements are contained within a `role="navigation"` or `<nav>` element.

## 3. Keyboard Paths

**WCAG Principle:** Operable (2.1 Keyboard Accessible, 2.4 Navigable)

**Requirement:**
All interactive elements within the dashboard shell, including buttons, input fields, checkboxes, and custom interactive components (e.g., MIT items, score tiles), must be fully operable via keyboard alone. The keyboard focus order must be logical and intuitive, following the visual flow of the page. A clear and persistent visual focus indicator must be provided for all interactive elements.

**Implementation Notes:**
- Ensure all `<button>` and `<input>` elements are naturally keyboard accessible.
- For custom interactive `div` elements (e.g., `.mit-item`, `.score-tile`), apply `tabindex="0"` to make them focusable and implement event listeners for `Enter` and `Space` keys to trigger their functionality.
- Verify that the default browser focus outline is visible and distinct, or provide custom `:focus` styles that meet WCAG 2.1 Level AA non-text contrast requirements (3:1 ratio).
- Test the tab order (`Tab` and `Shift+Tab`) to ensure it flows logically through the dashboard.

## 4. Contrast

**WCAG Principle:** Perceivable (1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)

**Requirement:**
All text and images of text must maintain a minimum contrast ratio of 4.5:1 against their background. For large text (18pt or 14pt bold and larger), a minimum contrast ratio of 3:1 is required. Non-textual components that convey information or are interactive (e.g., icons, input borders, focus indicators, graphical parts of UI components) must have a contrast ratio of at least 3:1 against adjacent colors.

**Implementation Notes:**
- Review all color pairings defined in CSS variables (e.g., `var(--text-primary)` on `var(--bg-base)`, `var(--text-muted)` on `var(--bg-surface)`).
- Ensure interactive element states (hover, focus, active) also meet contrast requirements for their borders, backgrounds, and text.
- Verify that the `lifeos-theme.js` script correctly applies themes that adhere to contrast standards for both light and dark modes.

## 5. Prefers-Reduced-Motion

**WCAG Principle:** Perceivable (2.3.3 Animation from Interactions, 2.2.2 Pause, Stop, Hide)

**Requirement:**
The dashboard must respect the user's preference for reduced motion, as indicated by the `prefers-reduced-motion` media query. Non-essential animations, transitions, and parallax effects should be disabled or significantly reduced when this preference is active, to prevent discomfort or distraction for users sensitive to motion.

**Implementation Notes:**
- Implement `@media (prefers-reduced-motion: reduce)` in the CSS to override or modify animation properties.
- For animations like `pulse-ring`, `fadeUp`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, and `mic-pulse`, provide alternative styles that remove or simplify the motion (e.g., `animation: none; transition: none;`).
- Prioritize preserving functionality over visual flair when motion is reduced.