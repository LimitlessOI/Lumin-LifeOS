The brief is incomplete as `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is missing. The specification below is derived from the existing `public/overlay/lifeos-dashboard.html` file.

## LifeOS Dashboard UI States Specification

### 1. Skeletons

Skeletons are used to indicate loading states for data-driven sections. They are implemented using a base `.skeleton` class for shimmer animation and a `.skel-line` class for individual line items.

**Structure:**
*   **Base Class:** `.skeleton`
    *   Applies a linear gradient background for the shimmer effect.
    *   `background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);`
    *   `background-size: 400px 100%;`
    *   `animation: shimmer 1.4s infinite;`
    *   `border-radius: var(--radius-sm);`
*   **Line Item Class:** `.skel-line`
    *   Defines height and bottom margin for typical text lines.
    *   `height: 14px;`
    *   `margin-bottom: 10px;`
    *   The last child often has a reduced width (`width: 60%;`) to simulate varying line lengths.
    *   Specific sections (e.g., Goals) may override `height` and `margin-top` for progress bar-like skeletons.
    *   Score tiles use a circular skeleton for the ring and a smaller line for the label.

**Usage Examples:**
*   **Today's MITs (`#mits-list`):**
    ```html
    <div class="skel-line skeleton w-full"></div>
    <div class="skel-line skeleton w-4/5"></div>
    <div class="skel-line skeleton w-3/5"></div>
    ```
*   **Today's Schedule (`#cal-list`):**
    ```html
    <div class="skel-line skeleton w-full"></div>
    <div class="skel-line skeleton w-3/4"></div>
    <div class="skel-line skeleton w-4/5"></div>
    ```
*   **Goals (`#goals-list`):**
    ```html
    <div class="skel-line skeleton w-full"></div>
    <div class="skel-line skeleton w-full" style="height:6px;margin-top:4px;margin-bottom:14px;border-radius:3px"></div>
    <div class="skel-line skeleton w-4/5"></div>
    <div class="skel-line skeleton w-full" style="height:6px;margin-top:4px;border-radius:3px"></div>
    ```
*   **Life Scores (`#scores-grid`):**
    ```html
    <div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
    ```

### 2. Shimmer Rules

The shimmer effect is applied via a CSS animation named `shimmer`.

**CSS Keyframes:**
```css
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}
```

**Application:**
*   The `.skeleton` class applies this animation: `animation: shimmer 1.4s infinite;`
*   The `background-size: 400px 100%;` on `.skeleton` ensures the gradient is wider than the element, allowing it to "move" across.

### 3. Optimistic UI Risks

Optimistic UI updates are present in interactive components, where the UI reflects a change immediately before server confirmation. This improves perceived responsiveness but introduces risks if the backend operation fails.

*   **MIT Toggle (`toggleMIT`):**
    *   **Optimistic Action:** The `mit-check` and `mit-text` elements immediately toggle their `done` class, visually updating the task status.
    *   **Risk:** If the `API('/api/v1/lifeos/commitments/${el.dataset.id}/keep', ...)` call fails, the UI will show the task as toggled (kept/unkept), but the backend state will not reflect this. The user might believe the action was successful when it was not.
    *   **Mitigation (Current):** No explicit rollback or error message is shown for API failures in `toggleMIT`. The UI remains in the optimistic state. A refresh would reveal the discrepancy.

*   **Chat Message Send (`sendChat`):**
    *   **Optimistic Action:** The user's message is immediately appended to the `chat-messages` box with the `msg user` class. The input field is cleared.
    *   **Risk:** If the `API('/api/v1/lifeos/chat/threads/${threadId}/messages', ...)` call fails, the user's message will still be displayed, but no assistant reply will follow, or an error message will appear.
    *   **Mitigation (Current):** An error message (`Something went wrong — try again.`) is appended as an `assistant` message if the API call fails. The `typing` indicator is removed. The user's message remains in the chat history.

*   **Add MIT (`addMIT`):**
    *   **Optimistic Action:** The input field (`mit-input`) is cleared immediately.
    *   **Risk:** If the `API('/api/v1/lifeos/commitments', ...)` call fails, the input is cleared, but the new MIT will not appear after `loadMITs()` is called (which re-fetches the list). The user might lose their input and not see the new task.
    *   **Mitigation (Current):** No explicit error message is shown for API failures in `addMIT`. The input is cleared regardless of success.

### 4. Empty States Copy Tone

The tone for empty states is generally concise, informative, and uses emojis to add a friendly visual cue. For sections that are data-driven, they often suggest an action to populate the section. For errors, they are direct.

*   **Today's MITs (`#mits-list`):**
    *   `<span>✅</span>No MITs — add one below`
    *   **Tone:** Encouraging, action-oriented, positive.
    *   **Error State:** `<span>⚠️</span>Could not load tasks`
    *   **Tone:** Informative, warning.

*   **Today's Schedule (`#cal-list`):**
    *   `<span>📅</span>Nothing scheduled today`
    *   **Tone:** Neutral, informative.
    *   **Error State:** `<span>📅</span>Could not load schedule`
    *   **Tone:** Informative.

*   **Goals (`#goals-list`):**
    *   `<span>🎯</span>No goals set yet`
    *   **Tone:** Neutral, informative, implies user action is needed.
    *   **Error State:** `<span>🎯</span>Could not load goals`
    *   **Tone:** Informative.

*   **Life Scores (`#scores-grid`):**
    *   **Error State (only):** `<span>📊</span>Could not load scores`
    *   **Tone:** Informative.

*   **Chat with Lumin (`#chat-messages`):**
    *   **Initial State:** `Hey Adam 👋 — what's on your mind today?` (Assistant message)
    *   **Ambient Nudge:** `🔔 Lumin: [message]`
    *   **Error State:** `Something went wrong — try again.` (Assistant message, slightly muted)
    *   **Tone:** Conversational, helpful, direct for errors.