The specification is incomplete as the `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file could not be found. The specification below is grounded in the provided `public/overlay/lifeos-dashboard.html` and general UI/UX principles.
---
# LifeOS Dashboard UI/UX Specification: Skeletons, Shimmer, Optimistic UI, Empty States

This document outlines the specification for visual feedback mechanisms and empty states within the LifeOS Dashboard, ensuring a consistent and responsive user experience.

## 1. Skeletons

Skeletons are used to indicate that content is loading, providing a visual placeholder that mimics the structure of the incoming data. This prevents jarring layout shifts and improves perceived performance.

### 1.1. Standard Skeleton Patterns

-   **Text Lines (`.skel-line`)**:
    -   **Purpose**: Placeholder for blocks of text (e.g., list items, descriptions).
    -   **Styling**:
        -   `height: 14px;`
        -   `margin-bottom: 10px;`
        -   `border-radius: var(--radius-sm);`
        -   Widths vary to simulate natural text flow (e.g., `w-full`, `w-4/5`, `w-3/5`).
    -   **Usage**: Apply `.skel-line` and `.skeleton` classes.
    -   **Examples**: Today's MITs list, Today's Schedule events, Goal names.

-   **Circular Elements**:
    -   **Purpose**: Placeholder for circular data visualizations (e.g., score rings, avatars).
    -   **Styling**:
        -   `width: 72px; height: 72px;`
        -   `border-radius: 50%;`
        -   `margin-bottom: 8px;`
    -   **Usage**: Apply `.skeleton` class with inline styles for dimensions and `border-radius:50%`.
    -   **Example**: Life Scores.

-   **Progress Bars**:
    -   **Purpose**: Placeholder for progress indicators.
    -   **Styling**:
        -   `height: 6px;`
        -   `border-radius: 3px;`
        -   `margin-top: 4px;`
    -   **Usage**: Apply `.skel-line` and `.skeleton` classes with inline styles for height, margin, and `border-radius`.
    -   **Example**: Goals progress bars.

### 1.2. Application Rules

-   Skeletons should be displayed immediately upon initiating a data fetch for a specific component or section.
-   They should be replaced by actual content as soon as the data is available.
-   The structure of the skeleton should closely match the expected layout of the loaded content to minimize reflow.

## 2. Shimmer Rules

The shimmer effect is a visual animation applied to skeletons to enhance the perception of activity and loading.

### 2.1. Standard Shimmer Animation

-   **Animation Name**: `shimmer`
-   **Keyframes**:
    ```css
    @keyframes shimmer {
        0% { background-position: -400px 0; }
        100% { background-position: 400px 0; }
    }
    ```
-   **Application**: Applied via the `.skeleton` class.
-   **Properties**:
    -   `animation: shimmer 1.4s infinite;`
    -   `background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);`
    -   `background-size: 400px 100%;`

### 2.2. Application Rules

-   The shimmer effect is automatically applied to any element with the `.skeleton` class.
-   It should be used for all loading states where a skeleton is present.
-   No custom shimmer animations should be introduced without explicit UI/UX review.

## 3. Optimistic UI Risks and Strategy

Optimistic UI updates the user interface immediately after a user action, assuming the server operation will succeed. This provides instant feedback and a more fluid experience.

### 3.1. Current Optimistic Patterns

-   **MIT Toggle**:
    -   **Behavior**: When an MIT is toggled (marked as kept/unkept), the UI (checkbox and text styling) updates instantly *before* the API call completes.
    -   **Risk**: If the API call fails, the UI does not revert to its previous state, leading to a desynchronized state between the UI and the backend.
    -   **Current Handling**: No explicit rollback on API error. The `catch` block is empty.

-   **Chat Message Send**:
    -   **Behavior**: User's message appears in the chat history instantly, and a "typing" indicator appears, *before* the API call for sending the message and receiving a reply completes.
    -   **Risk**: If the API call fails, the user's message remains in the UI, but no reply is received, potentially confusing the user.
    -   **Current Handling**: On API error, the "typing" indicator is removed, and an ambient error message ("Something went wrong — try again.") is added to the chat. The user's message is not removed.

### 3.2. Recommended Optimistic UI Strategy

-   **Immediate UI Update**: For actions where immediate feedback is critical (e.g., toggling a checkbox, sending a message), update the UI instantly.
-   **Error Handling and Rollback**:
    -   **MIT Toggle**: Implement a rollback mechanism. If the API call fails, revert the UI state (checkbox and text styling) to its pre-action state. Consider a temporary visual indicator (e.g., a small error icon) next to the item.
    -   **Chat Message Send**: The current error message is acceptable. However, consider adding a visual indicator to the *user's message* itself (e.g., a small warning icon) if the send failed, rather than just an ambient message. The user's message should generally persist, as it represents their input, but its status should be clear.
-   **Loading Indicators**: For optimistic actions that involve a backend process, ensure a subtle loading indicator is present (e.g., the "typing" indicator in chat, or a spinner on the MIT checkbox if the rollback is implemented).
-   **User Feedback**: Provide clear, concise feedback for both success (implied by the optimistic update) and failure (explicit error messages/rollbacks).

## 4. Empty States Copy Tone

Empty states provide guidance and context when a section has no content. The tone should be helpful, slightly informal, and encouraging.

### 4.1. General Tone and Style

-   **Concise**: Keep messages short and to the point.
-   **Helpful/Encouraging**: Guide the user on how to populate the section.
-   **Slightly Informal**: Use friendly language.
-   **Emojis**: Use relevant emojis to add visual interest and convey meaning quickly.
-   **Call to Action**: Where appropriate, suggest a clear next step.

### 4.2. Examples and Guidelines

-   **MITs (No content)**:
    -   `<span>✅</span>No MITs — add one below`
    -   **Guideline**: Use a positive, action-oriented emoji. Clearly state the absence of content and provide a direct call to action.

-   **Calendar (No content)**:
    -   `<span>📅</span>Nothing scheduled today`
    -   **Guideline**: Use a relevant emoji. State the absence of content clearly. A call to action might be less direct here, as scheduling might happen elsewhere.

-   **Goals (No content)**:
    -   `<span>🎯</span>No goals set yet`
    -   **Guideline**: Use a relevant emoji. State the absence of content and imply a call to action (setting goals).

-   **Data Loading Error**:
    -   `<span>⚠️</span>Could not load tasks` (for MITs)
    -   `<span>📅</span>Could not load schedule` (for Calendar)
    -   `<span>🎯</span>Could not load goals` (for Goals)
    -   `<span>📊</span>Could not load scores` (for Scores)
    -   **Guideline**: Use a warning emoji (`⚠️` or similar). Clearly state "Could not load [item]". This tone is more direct and less encouraging, reflecting an error state.

### 4.3. Implementation

-   Empty state messages are typically rendered within a `<div class="empty">` container.
-   Emojis are wrapped in `<span>` tags for consistent styling.
---
METADATA
{"target_file": "docs/projects/LIFEOS_DASHBOARD_UI_SPEC.md", "insert_after_line": null, "confidence": 0.6}