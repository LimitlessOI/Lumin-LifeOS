<!-- SYNOPSIS: Documentation — DASHBOARD LOADING EMPTY SPEC. -->

## Dashboard UI State Specification

This document outlines the patterns for skeletons, shimmer effects, optimistic UI considerations, and empty state copy tone for the LifeOS Dashboard, based on existing implementations in `public/overlay/lifeos-dashboard.html`.

### 1. Skeletons

Skeletons are used to indicate loading states for data-driven components, providing a visual placeholder before actual content is rendered.

**Existing Patterns:**
*   **General Skeleton Class**: The `.skeleton` class applies the base loading animation and background.
    ```css
    .skeleton {
        background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);
        background-size: 400px 100%;
        animation: shimmer 1.4s infinite;
        border-radius: var(--radius-sm);
    }
    ```
*   **Line Skeletons**: For text-based lists or blocks, `.skel-line` is used.
    ```css
    .skel-line {
        height: 14px;
        margin-bottom: 10px;
    }
    .skel-line:last-child {
        width: 60%; /* Tapered last line for visual variety */
    }
    ```
*   **Custom Skeletons**: For specific shapes like circular score rings, inline styles are used to override dimensions and border-radius.
    *   Example (Score Tile): `<div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div>`
    *   Example (Goal Progress Bar): `<div class="skel-line skeleton w-full" style="height:6px;margin-top:4px;margin-bottom:14px;border-radius:3px"></div>`

**Rules for New Skeletons:**
*   Always use the `.skeleton` class as the base.
*   For linear content, prefer `.skel-line` with appropriate `w-` (Tailwind width) classes.
*   For non-linear or custom shapes (e.g., circles, specific bars), apply inline `style` attributes for `width`, `height`, and `border-radius` directly to an element with `.skeleton` and `.skel-line` (if applicable for height/margin).
*   Ensure skeletons roughly match the dimensions and layout of the content they replace to minimize layout shifts.

### 2. Shimmer Rules

The shimmer effect provides a visual indication of active loading within a skeleton.

**Existing Pattern:**
*   **Animation Definition**:
    ```css
    @keyframes shimmer {
        0% { background-position: -400px 0; }
        100% { background-position: 400px 0; }
    }
    ```
*   **Application**: The `shimmer` animation is applied via the `.skeleton` class with a duration of `1.4s` and `infinite` iteration.
*   **Background Properties**: The `background-size: 400px 100%` on `.skeleton` ensures the gradient covers the element and allows the `background-position` animation to create the moving "shimmer" effect.

**Rules for New Shimmer Effects:**
*   The existing `.skeleton` class already includes the shimmer animation. No new CSS or animation definitions are typically required.
*   If a custom shimmer effect is needed for a unique component, it should follow the `background-position` animation pattern and be defined in the dashboard's stylesheet.

### 3. Optimistic UI Risks

Optimistic UI updates involve immediately reflecting a user's action in the UI before receiving confirmation from the server. This improves perceived responsiveness but carries the risk of displaying an incorrect state if the server operation fails.

**Identified Risks & Current Handling:**
*   **MIT Toggle (`toggleMIT`)**:
    *   **Risk**: The UI (`.mit-check`, `.mit-text` classes) is updated *before* the API call completes. If the API call fails, the UI will show the MIT as toggled (kept/unkept) when the backend state is unchanged.
    *   **Current Handling**: No explicit rollback or error state for the UI update itself. A console error is logged.
    *   **Recommendation**: For future optimistic updates, consider a temporary visual state (e.g., a subtle loading spinner on the item) or a mechanism to revert the UI change and display an error message if the API call fails.
*   **MIT Add (`addMIT`)**:
    *   **Risk**: Input is cleared *before* API call completes. If API fails, input is cleared but MIT isn't added.
    *   **Current Handling**: Input is cleared and `loadMITs()` is called *only after* a successful API response. This is *not* an optimistic update for the list itself, mitigating the risk. If the API fails, the input is not cleared, and an error is logged.
*   **Chat Send (`sendMessage`)**:
    *   **Risk**: The user's message is immediately added to the chat history and displayed in the UI. If the API call to Lumin fails, the user's message remains, but no assistant reply is received, and an "ambient" error message is displayed.
    *   **Current Handling**: This is a reasonable optimistic approach. The user's message is considered "sent" from their perspective. The failure is for the *reply*, which is handled by displaying an ambient error message. The typing indicator provides feedback while waiting for the reply.
    *   **Recommendation**: This pattern is acceptable for chat.

**General Optimistic UI Principles:**
*   **Prioritize User Feedback**: If an action is critical and failure is common, avoid optimistic updates or provide clear, immediate feedback on failure.
*   **Revert on Failure**: If an optimistic update is used, implement a mechanism to revert the UI to the correct state and display an error message if the backend operation fails.
*   **Loading Indicators**: Use subtle loading indicators on the specific element being updated to bridge the gap between optimistic update and server confirmation.

### 4. Empty States Copy Tone

Empty states provide guidance and context when a component has no data to display.

**Existing Patterns & Tone:**
*   **MITs**: `<span>✅</span>No MITs — add one below`
    *   **Tone**: Friendly, action-oriented, instructional. Uses a relevant emoji.
*   **Calendar**: `<span>🗓</span>No events today`
    *   **Tone**: Factual, neutral. Uses a relevant emoji.
*   **Goals**: `<span>🎯</span>No goals set`
    *   **Tone**: Factual, neutral. Uses a relevant emoji.
*   **Scores**: `<span>📊</span>No scores yet`
    *   **Tone**: Factual, neutral. Uses a relevant emoji.
*   **Error States**: `<span>⚠️</span>Failed to load MITs`
    *   **Tone**: Factual, warning. Uses a relevant emoji.

**Rules for New Empty States:**
*   **Concise and Direct**: Messages should be brief and to the point.
*   **Relevant Emoji**: Use a single, relevant emoji to visually reinforce the message.
*   **Action-Oriented (where appropriate)**: If the user can take an action to populate the state, suggest it (e.g., "add one below").
*   **Factual and Neutral**: For states where no immediate action is implied, simply state the current situation.
*   **Error Tone**: For loading failures, use a warning emoji (⚠️) and a clear "Failed to load [Component Name]" message.
*   **Styling**: Use the `.empty` class for consistent styling.