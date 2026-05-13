The output contract for "HTML FULL FILE" at the end of the prompt directly contradicts the explicit "TASK: Specification only" and "SPECIFICATION: Markdown sections" instructions. I will proceed with generating a Markdown specification as per the task, noting the contradiction.

# LifeOS Dashboard Shell Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on WCAG 2.1 AA principles for core interactive elements and structural components. This specification does not include HTML rewrites but provides guidelines for implementation.

## 1. Focus Management and Traps (WCAG 2.1 Success Criterion 2.4.3 Focus Order, 2.1.1 Keyboard)

### 1.1 Keyboard Focus Order
- **Requirement**: All interactive elements (buttons, input fields, links, custom widgets) must be reachable and operable via keyboard alone. The tab order (`tabindex`) must be logical and intuitive, following the visual flow of the page.
- **Current State (based on `lifeos-dashboard.html`)**:
    - Header controls (`btn-ambient`, `btn-theme`)
    - MITs section: `mit-input`, `btn-add`
    - Chat section: `chat-input`, `btn-mic`, `send-btn`, `speak-toggle` checkbox
- **Guidance**: Ensure custom interactive elements (e.g., `mit-item` if it becomes interactive beyond simple click, `score-tile` for long-press) are properly focusable and operable via keyboard.

### 1.2 Focus Traps
- **Requirement**: Users must not be trapped within any subsection of content. If a modal dialog or custom component creates a temporary focus trap, there must be a clear and keyboard-operable mechanism (e.g., `Escape` key, a close button) to release focus and return to the previous position in the tab order.
- **Guidance**: Currently, no explicit modal dialogs are present. If future components introduce such patterns (e.g., a detailed view for a score tile), ensure focus management prevents trapping.

### 1.3 Visible Focus Indicator
- **Requirement**: A clear and visible focus indicator must be present for all interactive elements when they receive keyboard focus.
- **Current State**: CSS includes `:focus` styles for `quick-add input`, `chat-row input`.
- **Guidance**: Extend focus styles to all interactive elements, including `hdr-btn`, `mit-item`, `btn-add`, `btn-mic`, `btn-send`, `speak-toggle` checkbox, and `score-tile` (if interactive).

## 2. Semantic Structure and Landmarks (WCAG 2.1 Success Criterion 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks)

### 2.1 HTML5 Semantic Elements
- **Requirement**: Utilize HTML5 semantic elements (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`, `<form>`, `<button>`, `<input>`) to convey the structure and purpose of content to assistive technologies.
- **Current State**:
    - `<header>` is used for the main page header.
    - `div.page` wraps the main content.
    - `div.card` elements are used for widgets.
- **Guidance**:
    - Wrap the main content within a `<main>` element (e.g., `div.page` could be `<main class="page">`).
    - Ensure `div.card` elements, especially those acting as distinct sections (e.g., "Today's MITs", "Chat with Lumin"), are semantically marked up, potentially using `<section>` with an `aria-labelledby` attribute pointing to their respective labels.
    - The `hdr-controls` could be wrapped in a `<nav>` if they represent primary navigation, or simply remain as buttons within the header.
    - The chat input area (`chat-row`) and its associated controls should be within a `<form>` element.

### 2.2 ARIA Roles and Attributes
- **Requirement**: Where native HTML semantics are insufficient, use ARIA roles and attributes to enhance accessibility, ensuring they are used correctly and do not duplicate native semantics.
- **Guidance**:
    - For custom interactive elements like `mit-item` or `score-tile`, consider `role="button"` or `role="gridcell"` with appropriate `aria-label` or `aria-describedby` if they perform complex actions or convey additional information.
    - The `pulse-dot` could have `aria-hidden="true"` if purely decorative.
    - The `score-tile`'s long-press tip could use `aria-describedby` or `aria-labelledby` to associate the tip content with the tile.

## 3. Color Contrast (WCAG 2.1 Success Criterion 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)

### 3.1 Text Contrast
- **Requirement**: Ensure a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text (18pt/24px regular or 14pt/18.66px bold) against its background.
- **Current State (based on CSS variables)**:
    - `var(--text-primary)` on `var(--bg-base)` or `var(--bg-surface)`
    - `var(--text-secondary)` on `var(--bg-surface2)`
    - `var(--text-muted)` on various backgrounds
- **Guidance**: Systematically check all text colors against their backgrounds to ensure they meet WCAG AA contrast ratios. Pay particular attention to `var(--text-muted)` and text on accent colors.

### 3.2 Non-Text Contrast
- **Requirement**: Ensure a minimum contrast ratio of 3:1 for graphical objects (e.g., icons, input borders, focus indicators) and UI components (e.g., buttons, checkboxes) against adjacent colors.
- **Current State**:
    - `hdr-btn` borders, `mit-check` borders, `quick-add input` borders, `btn-mic` borders, `score-ring` circles.
- **Guidance**: Verify contrast for all interactive element borders, icons, and states (e.g., `hdr-btn:hover`, `mit-check.done`, `btn-mic.listening`) to ensure they are clearly distinguishable.

## 4. Motion and Animation (WCAG 2.1 Success Criterion 2.3.3 Animation from Interactions)

### 4.1 Respect `prefers-reduced-motion`
- **Requirement**: Provide a mechanism to reduce or eliminate non-essential animations for users who have indicated a preference for reduced motion via their operating system settings (`@media (prefers-reduced-motion: reduce)`).
- **Current State**: Several animations are present (`pulse-ring`, `fadeUp`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, `mic-pulse`).
- **Guidance**:
    - Implement CSS media queries for `prefers-reduced-motion: reduce` to disable or significantly reduce the intensity of non-essential animations (e.g., `fadeUp`, `shimmer`, `bounce-dot`, `pulse-ring`).
    - Essential animations (e.g., progress indicators like `ring-fill`, `bar-grow`) may be retained but should be subtle.
    - Ensure any animation that conveys critical information also has a non-animated alternative.