The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file was not found. This specification is derived from the task prompt and the provided `public/overlay/lifeos-dashboard.html` file.

### Skeletons
*   **Purpose**: Provide visual feedback during data loading, indicating that content is on its way without showing a blank screen.
*   **Existing Pattern**:
    *   Base class: `.skeleton` (applies shimmer animation, background gradient, border-radius).
    *   Line class: `.skel-line` (sets height, margin-bottom, default width).
    *   Width variations: `w-full`, `w-4/5`, `w-3/5` (Tailwind classes), or inline styles for specific dimensions (e.g., `width:72px;height:72px;border-radius:50%` for score rings).
    *   Examples: MITs list, Calendar, Goals list, Scores grid.
*   **Rules for New Skeletons**:
    1.  Apply `.skeleton` to the container or individual elements.
    2.  Use `.skel-line` for text-like content placeholders.
    3.  Vary `width` (e.g., `w-full`, `w-4/5`, `w-3/5`) to simulate varying text lengths.
    4.  For non-rectangular elements (e.g., circular loaders), use inline styles for `width`, `height`, and `border-radius: 50%` in conjunction with `.skeleton`.
    5.  Ensure skeletons match the layout and approximate dimensions of the content they replace.

### Shimmer Rules
*   **Purpose**: Enhance the visual appeal of skeleton loaders, indicating active loading.
*   **Existing Pattern**:
    *   `@keyframes shimmer` defined in CSS.
    *   Applied via `.skeleton` class: `animation: shimmer 1.4s infinite;`.
    *   Background gradient: `linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);`
    *   Background size: `400px 100%`.
*   **Rules for Shimmer Application**:
    1.  The shimmer effect is automatically applied to any element with the `.skeleton` class.
    2.  No additional classes or specific timing are required beyond applying `.skeleton`.
    3.  Ensure the `var(--bg-surface2)` and `var(--bg-overlay)` CSS variables are correctly defined in the theme for consistent appearance.

### Optimistic UI Risks
*   **Purpose**: Improve perceived performance and responsiveness by updating the UI immediately after a user action, before server confirmation.
*   **Identified Opportunities & Risks**:
    1.  **MITs (Add/Toggle)**:
        *   **Opportunity**: Immediately show a new MIT added or an existing MIT toggled (checked/unchecked).
        *   **Risk**: Network failure, server error (e.g., validation failed, database write failed).
        *   **Mitigation**:
            *   **Add**: Temporarily add the new MIT to the UI with a "pending" or "saving" visual state. If API fails, remove it and show an error.
            *   **Toggle**: Immediately update the checkmark/text style. If API fails, revert the UI state and show an error.
            *   **General**: Implement a robust rollback mechanism. Display clear, non-intrusive error messages (e.g., a small toast notification).
    2.  **Chat Messages (Send)**:
        *   **Opportunity**: Immediately display the user's sent message in the chat history.
        *   **Risk**: Network failure, server error (Lumin unavailable).
        *   **Mitigation**:
            *   Display the user's message immediately.
            *   Show a typing indicator for the assistant.
            *   If the API call fails, replace the assistant's typing indicator with an "ambient" error message (e.g., "Lumin is unavailable right now.") and potentially allow the user to retry.
*   **General Principles**:
    1.  **Immediate Feedback**: Update UI instantly for user actions.
    2.  **Pending State**: Use subtle visual cues (e.g., reduced opacity, spinner, "saving..." text) for items awaiting server confirmation.
    3.  **Error Handling & Rollback**: Always have a mechanism to revert the UI to its previous state if the server operation fails. Clearly communicate errors to the user.

### Empty States Copy Tone
*   **Purpose**: Guide users when a section has no data, encouraging interaction or providing context.
*   **Existing Tone Analysis**:
    *   **MITs**: `<span>✅</span>No MITs — add one below` (Positive, encouraging, clear call to action, uses emoji).
    *   **Calendar**: `<span>🗓</span>No events today` (Neutral, informative, uses emoji).
    *   **Goals**: `<span>🎯</span>No goals set` (Neutral, informative, implies action, uses emoji).
    *   **Scores**: `<span>📊</span>No scores yet` (Neutral, informative, uses emoji).
    *   **Chat (Error)**: `<span>⚠️</span>Failed to load MITs`, `Lumin is unavailable right now. Please try again later.`, `Failed to connect to Lumin. Check your network.` (Informative, slightly apologetic, suggests troubleshooting, uses emoji for general errors).
*   **Recommended Tone for New Empty States**:
    1.  **Informative & Concise**: Clearly state why the section is empty.
    2.  **Action-Oriented (where applicable)**: If the user can add data, provide a gentle call to action.
    3.  **Positive/Encouraging**: Avoid negative language. Frame emptiness as an opportunity or a temporary state.
    4.  **Use Emojis**: Leverage relevant emojis (e.g., ✅, 🗓, 🎯, 📊) to add visual appeal and reinforce meaning, consistent with existing patterns.
    5.  **Error States**: For API failures, be direct about the problem, suggest a simple solution if possible (e.g., "check network"), and maintain a helpful, non-blaming tone. Use `⚠️` for general loading errors.