# LifeOS Dashboard Shell Accessibility Specification

## Introduction
This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on key areas to ensure an inclusive user experience. Adherence to these guidelines is critical for meeting WCAG 2.1 AA standards.

## 1. Semantic Structure and Landmarks (WCAG 2.1 SC 1.3.1 Info and Relationships)
The dashboard shell must utilize appropriate HTML5 semantic elements and ARIA landmark roles to convey the structure and organization of content to assistive technologies.

### Requirements:
*   The primary content area (`.page` div) should be contained within a `<main>` element or have `role="main"` to clearly identify the main content of the document.
*   The header (`<header>`) should be clearly identifiable, implicitly providing `role="banner"`.
*   Navigation elements, if introduced for switching between dashboard sections, must use `<nav>` or `role="navigation"`.
*   The `lifeos-ai-rail-root` div, if it contains significant content, should be assigned an appropriate landmark role (e.g., `role="complementary"` or `role="region"`) with an accessible name (`aria-label`) to describe its purpose.
*   All interactive sections (e.g., "Today's MITs", "Today's Schedule", "Goals", "Life Scores", "Chat with Lumin") must be clearly delineated with appropriate heading elements (`<h2>`, `<h3>`) to establish a logical content hierarchy.

## 2. Keyboard Operability and Focus Management (WCAG 2.1 SC 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible)
All interactive components within the dashboard shell must be fully operable via keyboard alone, with a logical tab order and clear visual focus indicators.

### Requirements:
*   **Keyboard Navigation:** All interactive elements, including buttons (`.hdr-btn`, `.btn-add`, `.btn-mic`, `.btn-send`), input fields (`#mit-input`, `#chat-input`, `#speak-toggle`), and interactive list items (`.mit-item`, `.score-tile`), must be reachable and actionable using standard keyboard commands (Tab, Shift+Tab, Enter, Space).
*   **Focus Order:** The keyboard tab order must be logical and intuitive, following the visual flow of the page.
*   **Focus Visible:** A clear and consistent visual indicator must be present for the currently focused element, meeting WCAG 2.4.7. The existing `:focus` styles should be reviewed for sufficient contrast and prominence.
*   **No Keyboard Trap (WCAG 2.1 SC 2.1.2):** Users must be able to navigate away from any component using only the keyboard. This is particularly important for any future modal dialogs or complex widgets.
*   **Long-Press Alternatives:** For elements with long-press functionality (e.g., `.mit-item` for description, `.score-tile` for tips), a keyboard-accessible alternative must be provided. This could be a tooltip that appears on focus, a dedicated "info" button, or an `aria-describedby` attribute linking to a descriptive element.

## 3. Color Contrast (WCAG 2.1 SC 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)
The visual presentation of text and non-text content must have sufficient contrast against its background to be perceivable by users with low vision.

### Requirements:
*   **Text Contrast:** All text content must meet a minimum contrast ratio of 4.5:1 against its background. This includes primary text (`--text-primary`), secondary text (`--text-secondary`), muted text (`--text-muted`), and text within buttons.
*   **Non-text Contrast:** Graphical objects that are essential for understanding content (e.g., icons in buttons, the checkmark in `.mit-check`, the rings in `.score-ring`) must have a minimum contrast ratio of 3:1 against adjacent colors.
*   **Focus Indicators:** The visual focus indicator must also meet a 3:1 contrast ratio against its adjacent colors to ensure it is clearly distinguishable.

## 4. Motion and Animation (WCAG 2.1 SC 2.3.3 Animation from Interactions)
Animations and motion effects should be designed to be non-disruptive and provide an option for users to reduce or disable them.

### Requirements:
*   **`prefers-reduced-motion`:** The dashboard shell must respect the user's `prefers-reduced-motion` operating system setting.
*   **Reduced Motion Implementation:**
    *   For users who prefer reduced motion, animations such as `pulse-ring`, `fadeUp`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, and `mic-pulse` should be either disabled, significantly reduced in intensity, or replaced with static transitions.
    *   CSS media queries (`@media (prefers-reduced-motion: reduce)`) must be used to apply alternative styles that minimize or remove motion.
*   **Non-essential Animations:** All animations should be considered non-essential unless they convey critical information that cannot be conveyed by other means.

## 5. Focus Traps (WCAG 2.1 SC 2.1.2 No Keyboard Trap)
While the current HTML does not present obvious complex interactive components that would create focus traps, any future additions must adhere to this principle.

### Requirements:
*   If any modal dialogs, pop-ups, or complex interactive widgets are introduced, keyboard focus must be programmatically managed to remain within that component until it is dismissed.
*   Upon dismissal, focus must return to the element that invoked the component.

This specification provides a framework for ensuring the LifeOS Dashboard shell is accessible. Future development and UI updates must be reviewed against these requirements.