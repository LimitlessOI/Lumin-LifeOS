# LifeOS Dashboard Shell Accessibility Specification

This document outlines the accessibility requirements for the LifeOS Dashboard shell, focusing on key WCAG principles to ensure a robust and inclusive user experience. These guidelines apply to the core structure and interactive elements of the dashboard, ensuring operability and perceivability for users with diverse needs.

## 1. Focus Traps (WCAG 2.1.2 No Keyboard Trap, 2.4.3 Focus Order)

### 1.1 Requirement
When modal dialogs, overlays (e.g., the AI rail), or other temporary interactive components are activated, keyboard focus MUST be programmatically managed to remain within that component until it is dismissed. Users MUST NOT be able to tab out of the active component into the underlying page content.

### 1.2 Implementation Guidance
- Implement a mechanism to capture and cycle focus within the active modal/overlay.
- Ensure that pressing `Escape` dismisses the modal/overlay and returns focus to the element that triggered it.
- Verify that all interactive elements within the modal/overlay are reachable via keyboard.

## 2. Landmarks (WCAG 1.3.1 Info and Relationships)

### 2.1 Requirement
The dashboard shell MUST utilize appropriate HTML5 semantic landmark elements to define distinct regions of the page, enhancing navigation and understanding for assistive technology users. All significant content areas MUST be contained within a landmark region.

### 2.2 Implementation Guidance
- Use `<header>` for the main page header.
- Use `<main>` for the primary content area of the dashboard.
- Use `<aside>` for supplementary content, such as the AI rail (`lifeos-ai-rail-root`).
- Use `<form>` for interactive input sections like "Quick add" and "Chat input row".
- Ensure that landmark regions are uniquely identifiable, especially if multiple instances of the same landmark type exist (e.g., using `aria-label` or `aria-labelledby`).

## 3. Keyboard Paths (WCAG 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible)

### 3.1 Requirement
All interactive elements within the dashboard shell (buttons, input fields, links, custom controls) MUST be fully operable and navigable using only a keyboard. The keyboard focus order MUST be logical and intuitive, following the visual flow of the page. A clear and visible focus indicator MUST be present for all interactive elements.

### 3.2 Implementation Guidance
- Ensure all `button` elements, `input` fields, and other interactive components are naturally included in the tab order.
- For custom interactive elements (e.g., `.mit-item`, `.score-tile`), ensure they have `tabindex="0"` if not inherently focusable, and handle keyboard events (`Enter`, `Space`) to trigger their actions.
- Verify that the default browser focus outline is not suppressed or that a custom, high-contrast focus indicator is provided.
- Test the entire dashboard flow using only the `Tab`, `Shift+Tab`, `Enter`, and `Space` keys.

## 4. Contrast (WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast)

### 4.1 Requirement
The visual presentation of text and images of text MUST have a contrast ratio of at least 4.5:1 against the background, or 3:1 for large text (18pt or 14pt bold). Non-textual components that convey information or are interactive (e.g., icons, input borders, focus indicators) MUST have a contrast ratio of at least 3:1 against adjacent colors.

### 4.2 Implementation Guidance
- Review all color pairings for text and background to meet WCAG AA standards.
- Ensure interactive elements like `.hdr-btn`, `.mit-check`, `.quick-add input`, `.chat-row input`, `.btn-mic`, and `.btn-send` have sufficient contrast for their borders and icons in both default and focused states.
- Pay particular attention to the `var(--border)` and `var(--border-focus)` colors against `var(--bg-surface)` and `var(--bg-surface2)`.

## 5. Prefers-Reduced-Motion (WCAG 2.3.3 Animation from Interactions)

### 5.1 Requirement
The dashboard shell MUST respect the user's `prefers-reduced-motion` media query setting. When `prefers-reduced-motion: reduce` is active, non-essential animations and transitions MUST be disabled or significantly reduced to minimize motion sickness and cognitive load.

### 5.2 Implementation Guidance
- Use `@media (prefers-reduced-motion: reduce)` queries in CSS to override or modify animation properties.
- Animations such as `pulse-ring`, `fadeUp`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, and `mic-pulse` should be targeted.
- For `fadeUp`, consider replacing with `opacity: 1` or a very short, subtle fade.
- For `pulse-dot`, `shimmer`, `bounce-dot`, and `mic-pulse`, consider disabling them entirely or replacing with static states.
- For progress animations like `ring-fill` and `bar-grow`, ensure the final state is immediately visible or achieved with a very short, non-distracting transition.