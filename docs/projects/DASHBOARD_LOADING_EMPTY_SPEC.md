The contradiction is that the task asks for a specification in Markdown, but the instruction block demands a full HTML code implementation. I am providing the Markdown specification as requested by the task and specification sections.

# LifeOS Dashboard UI States Specification

This document outlines the patterns and guidelines for skeletons, shimmer effects, optimistic UI considerations, and empty states copy tone for the LifeOS Dashboard, based on existing patterns in `public/overlay/lifeos-dashboard.html`.

## 1. Skeletons and Shimmer Rules

**Purpose:** To provide visual feedback to the user that content is loading, reducing perceived wait times and improving user experience.

**Existing Patterns:**
-   The `public/overlay/lifeos-dashboard.html` already defines `.skeleton` and `.skel-line` classes.
-   The `.skeleton` class applies a `linear-gradient` background and the `shimmer` animation.
-   `skel-line` defines basic height and margin for text lines.
-   Custom skeleton shapes are used for circular elements (e.g., scores).

**Guidelines:**
-   **Class Application:** Apply the `skeleton` class to container elements or individual content blocks that are awaiting data. For text lines, use `skel-line` in conjunction with `skeleton`.
-   **Shape and Size:**
    -   For text content, use `skel-line` with appropriate `w-` (width) utility classes (e.g., `w-full`, `w-4/5`, `w-3/5`) to mimic varying line lengths.
    -   For non-text elements (e.g., images, avatars, circular scores), create custom skeleton elements with matching dimensions and `border-radius` to approximate the final content shape.
-   **Shimmer Animation:** The `shimmer` animation (`@keyframes shimmer`) is automatically applied via the `.skeleton` class. Ensure this animation is active during loading states.
-   **Removal:** Skeletons must be replaced with actual data once fetched and rendered.

**Example Usage (from existing HTML):**
```html
<div id="mits-list">
    <div class="skel-line skeleton w-full"></div>
    <div class="skel-line skeleton w-4/5"></div>
    <div class="skel-line skeleton w-3/5"></div>
</div>
<!-- For scores -->
<div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
```

## 2. Optimistic UI Risks and Mitigation

**Purpose:** To identify potential issues when implementing optimistic UI updates and define strategies to handle them. Optimistic UI updates involve immediately reflecting a user's action in the UI before receiving confirmation from the server.

**Identified Areas for Optimistic UI:**
-   **MITs (Add/Toggle):**
    -   **Add MIT:** When a user adds a new MIT, the UI could immediately display the new MIT in the list.
    -   **Toggle MIT:** When a user marks an MIT as done/undone, the UI could immediately update the checkbox and text styling.
-   **Chat Messages:** When a user sends a message, their message could immediately appear in the chat history.

**Risks:**
-   **Data Inconsistency:** If the backend API call fails after an optimistic update, the UI will show a state that is not reflected on the server. This can confuse users and lead to data loss or incorrect assumptions.
-   **User Frustration:** If an optimistic update frequently fails and reverts, users may lose trust in the system.
-   **Complex Rollback Logic:** Implementing robust rollback mechanisms for failed optimistic updates can add complexity to the frontend code.

**Mitigation Strategies:**
1.  **Clear Feedback on Failure:** Always provide immediate and clear visual feedback if an optimistic update fails (e.g., a temporary error message, a visual indicator on the failed item).
2.  **Graceful Rollback:** Implement logic to revert the UI to its previous state if the API call fails. For example, remove the optimistically added MIT, or revert the MIT's done status.
3.  **Disable Interaction (for critical actions):** For actions where data consistency is paramount (e.g., financial transactions, critical system changes), avoid optimistic updates. Instead, disable the UI element until server confirmation is received.
4.  **Loading Indicators:** Even with optimistic updates, a subtle loading indicator (e.g., a spinner on the specific item) can be used to show that a background operation is in progress.
5.  **Retry Mechanism:** Consider offering a "retry" option for failed operations.

**Specific Recommendations:**
-   **MITs:** Optimistic updates are acceptable for adding and toggling MITs. On failure, the item should either be removed (if adding) or reverted to its previous state (if toggling), with a temporary error message displayed.
-   **Chat:** Optimistically display user messages. If the API fails, display an "ambient" error message (as currently implemented) and potentially allow the user to retry sending.

## 3. Empty States Copy Tone

**Purpose:** To define a consistent and helpful tone for messages displayed when a section of the dashboard has no content.

**Existing Tone Analysis (from `public/overlay/lifeos-dashboard.html`):**
-   "No MITs — add one below" (Action-oriented, encouraging, uses emoji ✅)
-   "No events today" (Informative, neutral, uses emoji 🗓)
-   "No goals set" (Informative, slightly prompting, uses emoji 🎯)
-   "No scores yet" (Informative, neutral, uses emoji 📊)
-   "Failed to load MITs" (Error, informative, uses emoji ⚠️)

**Guidelines for Copy Tone:**
1.  **Informative and Concise:** Clearly state the absence of content. Avoid jargon.
2.  **Action-Oriented (where applicable):** If the user can take an action to populate the section, gently guide them. Use phrases like "add one below," "set a goal," or "create your first [item type]."
3.  **Empathetic and Encouraging:** Maintain a supportive and helpful tone. Avoid sounding accusatory or overly cheerful.
4.  **Consistent Emoji Usage:** Use relevant emojis to visually reinforce the message and maintain brand consistency.
    -   ✅ for completed/empty but ready for action (e.g., MITs)
    -   🗓 for calendar/schedule
    -   🎯 for goals
    -   📊 for data/scores
    -   ⚠️ for errors or warnings
5.  **Error States:** For errors (e.g., "Failed to load X"), be direct, informative, and suggest a potential cause or next step if possible (e.g., "Check your network"). Use the ⚠️ emoji.

**Examples of Recommended Copy:**
-   **MITs:** "✅ No MITs — add one below to get started."
-   **Calendar:** "🗓 No events today. Enjoy the quiet!" (or "🗓 Your schedule is clear.")
-   **Goals:** "🎯 No goals set yet. Define what matters most."
-   **Scores:** "📊 No scores to display. Start tracking your progress."
-   **General Empty List:** "✨ Nothing here yet. Time to create something new!"
-   **Loading Error:** "⚠️ Failed to load [Section Name]. Please try refreshing."