The brief `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was not found, so this specification is inferred from existing UI patterns.

# LifeOS Dashboard UI Specification

## Skeletons
*   **Purpose:** Provide visual feedback during data loading, indicating content structure without actual data.
*   **Styling:**
    *   Base class: `.skeleton`
        *   `background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);`
        *   `background-size: 400px 100%;`
        *   `animation: shimmer 1.4s infinite;`
        *   `border-radius: var(--radius-sm);`
    *   Line elements: `.skel-line`
        *   `height: 14px;`
        *   `margin-bottom: 10px;`
        *   Last child in a group: `width: 60%;`
    *   Specific overrides (examples):
        *   Goals progress bar: `height: 6px; margin-top: 4px; margin-bottom: 14px; border-radius: 3px;`
        *   Score circles: `width: 72px; height: 72px; border-radius: 50%; margin-bottom: 8px;`
        *   Score labels: `width: 60px; height: 10px;`
*   **Usage:** Applied to `div` elements within data-display sections (e.g., MITs, Calendar, Goals, Scores) before actual data is rendered.

## Shimmer Rules
*   **Animation:** `@keyframes shimmer`
    *   `0% { background-position: -400px 0; }`
    *   `100% { background-position: 400px 0; }`
*   **Application:** Applied to elements with the `.skeleton` class via `animation: shimmer 1.4s infinite;`. This creates a continuous left-to-right gradient movement, simulating a loading effect.

## Optimistic UI Risks
*   **Current Approach:** The existing dashboard primarily uses a "wait-for-response" pattern for data-modifying actions (e.g., adding/toggling MITs, sending chat messages for assistant replies). User-initiated chat messages are added to the UI immediately, but the assistant's reply awaits the API.
*   **Identified Risks (if optimistic updates were implemented more broadly):**
    1.  **Data Inconsistency:** If a user action (e.g., marking an MIT as complete) optimistically updates the UI, but the API call fails, the UI will show an incorrect state until a refresh or explicit error handling.
    2.  **Loss of User Input:** For actions like adding an MIT, an optimistic update followed by an API failure could lead to the newly added item disappearing, causing user frustration.
    3.  **Complex Rollbacks:** Implementing robust optimistic UI requires mechanisms to roll back UI changes if the API fails, adding complexity to the frontend logic.
*   **Recommendation:** For critical data modifications, prioritize data consistency. For non-critical, high-frequency interactions where immediate feedback is paramount (e.g., user's own chat message appearing), a controlled optimistic update can be considered, provided clear error states or eventual consistency mechanisms are in place.

## Empty States Copy Tone
*   **General Tone:** Factual, concise, helpful, and slightly encouraging. Avoids overly apologetic or overly cheerful language.
*   **Key Elements:**
    *   **Emoji:** Uses a relevant emoji at the beginning of the message (e.g., ✅ for MITs, 📅 for Calendar, 🎯 for Goals, 📊 for Scores, ⚠️ for errors).
    *   **Clarity:** Clearly states the current empty condition.
    *   **Guidance (when applicable):** Provides a clear next step for the user (e.g., "add one below", "No goals set yet").
    *   **Error States:** For API failures, uses a warning emoji (⚠️) and a direct statement like "Could not load [item]".
*   **Examples from existing UI:**
    *   "<span>✅</span>No MITs — add one below"
    *   "<span>📅</span>Nothing scheduled today"
    *   "<span>🎯</span>No goals set yet"
    *   "<span>⚠️</span>Could not load tasks"
    *   "<span>📊</span>Could not load scores"