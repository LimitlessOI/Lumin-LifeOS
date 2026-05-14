The task specification is contradictory regarding the expected output format. The primary task instruction explicitly asks for a "Specification only" in "Markdown sections" with "no HTML rewrite," while the final "INSTRUCTION" and "HTML FULL FILE — STRICT OUTPUT CONTRACT" demand a full HTML file as output. I am proceeding with a markdown specification as per the explicit task description for content, noting the contradiction.

### LifeOS Dashboard Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on key WCAG principles to ensure an inclusive user experience. These guidelines apply to the overall structure and interactive elements of `public/overlay/lifeos-dashboard.html` and any components integrated within it.

#### 1. Focus Management and Traps (WCAG 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible)

*   **Focus Order:** All interactive elements (buttons, input fields, links, custom controls) must be reachable and operable via keyboard in a logical and predictable order that follows the visual layout.
*   **Focus Visible:** A clear and distinct visual indicator must be present for the element currently in focus. This indicator should meet a contrast ratio of at least 3:1 against adjacent colors. The existing `:focus` styles should be reviewed and enhanced if necessary.
*   **Focus Traps:** When modal dialogs or other temporary overlays are introduced (e.g., for settings, confirmations, or AI rail interactions), focus must be programmatically trapped within the active overlay. Users must be able to escape the trap (e.g., via `Escape` key) to return focus to the underlying content. Focus should return to the element that triggered the overlay upon its dismissal.
*   **No Keyboard Traps:** Users must not be trapped within any content or component, meaning they can navigate away from any element using standard keyboard commands.

#### 2. Semantic Structure and Landmarks (WCAG 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks)

*   **HTML5 Semantic Elements:** The dashboard structure must utilize appropriate HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>`, `<article>`) to convey the purpose and structure of content to assistive technologies.
*   **ARIA Landmarks:** Where native HTML5 semantics are insufficient or for custom components, ARIA landmark roles (e.g., `role="banner"`, `role="navigation"`, `role="main"`, `role="complementary"`, `role="contentinfo"`) should be applied to define regions of the page.
*   **Heading Structure:** Content must be organized with a logical heading hierarchy (`<h1>` through `<h6>`) to provide an outline for screen reader users. Headings should accurately describe the section they introduce.
*   **Skip Links:** A "Skip to main content" link should be provided as the first focusable element on the page, allowing keyboard and screen reader users to bypass repetitive navigation and header content. This link should be visually hidden until focused.

#### 3. Keyboard Accessibility (WCAG 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order)

*   **All Functionality Operable by Keyboard:** All interactive functionality available via mouse must also be operable via keyboard alone, without requiring specific timings for individual keystrokes. This includes buttons, links, form controls, and custom widgets.
*   **Standard Keyboard Interactions:** Standard keyboard conventions should be followed (e.g., `Tab` for next focusable element, `Shift+Tab` for previous, `Enter`/`Space` for activation, `Escape` for closing modals/menus).
*   **Custom Controls:** Any custom interactive controls (e.g., custom checkboxes, radio buttons, sliders, tabs) must implement appropriate ARIA roles, states, and properties (e.g., `role="checkbox"`, `aria-checked`, `aria-label`) and respond to standard keyboard input.

#### 4. Contrast Ratios (WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)

*   **Text Contrast:** All essential text content must have a contrast ratio of at least 4.5:1 against its background. Large text (18pt or 14pt bold) requires a minimum of 3:1.
*   **Non-text Contrast:** Graphical objects (e.g., icons conveying information, parts of user interface components like input borders, focus indicators) must have a contrast ratio of at least 3:1 against adjacent colors.
*   **Color Not Sole Means:** Color should not be the sole visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. Redundant cues (e.g., text labels, icons, patterns) should be used.

#### 5. Motion and Animation (WCAG 2.3.3 Animation from Interactions, 2.2.2 Pause, Stop, Hide)

*   **`prefers-reduced-motion`:** The dashboard must respect the user's `prefers-reduced-motion` media query setting. When `reduce` is preferred, non-essential animations, transitions, and parallax effects should be minimized or removed. This includes:
    *   Disabling or significantly reducing the duration of `fadeUp` animations.
    *   Minimizing or removing `pulse-ring`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, and `mic-pulse` animations.
    *   Ensuring any remaining motion is subtle and does not cause discomfort.
*   **Controllable Motion:** Any essential animations that cannot be removed (e.g., for conveying status) must be short, non-blinking, and provide a mechanism for users to pause, stop, or hide them if they last longer than five seconds.

This specification serves as a guide for future development and auditing of the LifeOS Dashboard to ensure it meets a high standard of accessibility.