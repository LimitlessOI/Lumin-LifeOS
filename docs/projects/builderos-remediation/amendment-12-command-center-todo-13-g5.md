# BuilderOS Remediation: Amendment 12 Command Center - Todo 13 G5 (Project Card Tooltip)

This memo addresses the blueprint task: "Hover on project card shows tooltip with focus + last worked."

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Data Source for "Focus" and "Last Worked":**
    *   Are `focus` (string) and `lastWorked` (ISO string or timestamp) already properties on the `Project` data model passed to `ProjectCard`? If not, where should this data be sourced or derived?
    *   What is the canonical format for `lastWorked` display (e.g., "2 days ago", "YYYY-MM-DD HH:MM")?
*   **Tooltip Component Strategy:**
    *   Is there an existing, reusable `Tooltip` component in the UI library? If so, what is its API and how should it be integrated?
    *   If not, should a new, generic `Tooltip` component be created, or should the tooltip logic be embedded directly within `ProjectCard`?
*   **Styling and Positioning:**
    *   Are there specific design guidelines for tooltip appearance (colors, fonts, padding, border-radius)?
    *   What is the desired tooltip position relative to the project card (e.g., top, bottom, left, right, centered)?

### 2. Already-Settled Constraints

*   **Scope:** BuilderOS internal feature only; no impact on LifeOS user features or TSOS customer-facing surfaces.
*   **Trigger:** Tooltip appears on hover over a `ProjectCard` component.
*   **Content:** Must display "focus" and "last worked" information.
*   **Technical Stack:** Node/ESM, React/JSX (assumed for UI components), following existing patterns.
*   **Principle:** Extend existing components; do not rebuild.

### 3. Smallest Buildable Next Slice

1.  **Identify `ProjectCard`:** Locate the primary `ProjectCard` component file.
2.  **Data Availability Check:** Assume `project.focus` (string) and `project.lastWorked` (Date or ISO string) are available as props to `ProjectCard`. If not, this slice is blocked.
3.  **Basic Tooltip Integration:**
    *   Add a `div` element within `ProjectCard` to serve as the tooltip container.
    *   Apply basic CSS to hide this `div` by default and show it on `ProjectCard` hover.
    *   Populate the tooltip `div` with `project.focus` and a basic formatted `project.lastWorked` (e.g., `new Date(project.lastWorked).toLocaleDateString()`).
    *   Ensure basic positioning (e.g., absolute positioning relative to the card).

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/components/ProjectCard/ProjectCard.jsx` (or `.tsx`): Modify to include tooltip structure and logic.
*   `src/components/ProjectCard/ProjectCard.module.css` (or `.css`): Add styles for the tooltip container, hover effects, and text formatting.
*   `src/types/project.ts` (if applicable): Verify `Project` interface includes `focus` and `lastWorked`. If not, add them.

### 5. Required Verifier/Runtime Checks

*   **Unit Tests (`ProjectCard.test.jsx`):**
    *   `ProjectCard` renders without tooltip visible.