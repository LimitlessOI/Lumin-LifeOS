The brief `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was not found. The specification below is inferred directly from the provided `public/overlay/lifeos-dashboard.html` file.

## LifeOS Dashboard UI Specification

### 1. Skeletons

Skeletons are used to indicate loading states for various dashboard sections. They consist of `div` elements with the `skeleton` class, often combined with `skel-line` for text-like placeholders or custom dimensions for circular/rectangular shapes.

**Core Classes:**
*   `.skeleton`: Applies the shimmer animation and base background gradient.
    *   `background`: `linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%)`
    *   `background-size`: `400px 100%`
    *   `animation`: `shimmer 1.4s infinite`
    *   `border-radius`: `var(--radius-sm)`
*   `.skel-line`: Defines height and margin for text line placeholders.
    *   `height`: `14px`
    *   `margin-bottom`: `10px`
    *   `width`: Typically `w-full`, `w-4/5`, `w-3/5`, or `w-3/4` (Tailwind classes) to vary line lengths. The last line in a group often has `width: 60%`.

**Usage Examples:**
*   **Today's MITs (`#mits-list`)**: Three `skel-line` elements with varying widths (`w-full`, `w-4/5`, `w-3/5`).
*   **Today's Schedule (`#cal-list`)**: Three `skel-line` elements with varying widths (`w-full`, `w-3/4`, `w-4/5`).
*   **Goals (`#goals-list`)**: Two `skel-line` elements for goal names, interspersed with `skel-line` elements styled for progress bars (`height:6px`, `border-radius:3px`).
*   **Life Scores (`#scores-grid`)**: Each score tile uses a circular `skel-line` (`width:72px`, `height:72px`, `border-radius:50%`) for the ring, and a smaller `skel-line` (`width:60px`, `height:10px`) for the label.

### 2. Shimmer Rules

The shimmer effect is applied via the `.skeleton` class using a CSS animation.

**Animation Definition:**
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
This animation moves the `background-position` of the linear gradient, creating a "shimmering" light effect across the skeleton elements. The animation runs infinitely with a duration of `1.4s`.

### 3. Optimistic UI Risks

The dashboard implements optimistic UI updates in several areas, where the UI is updated immediately before awaiting a server response. This improves perceived responsiveness but introduces risks if the server operation fails.

**Identified Optimistic UI Patterns and Risks:**
*   **MIT Toggle (`toggleMIT`)**:
    *   **Pattern**: The `mit-check` and `mit-text` classes are toggled (`done` class added/removed) *before* the API call to `/api/v1/lifeos/commitments/{id}/keep` is made.
    *   **Risk**: If the API call fails (e.g., network error, server error), the UI will show the MIT as toggled (kept/unkept), but the backend state will not reflect this. There is no explicit UI rollback in the `catch` block.
*   **Add MIT (`addMIT`)**:
    *   **Pattern**: The input field (`#mit-input`) is cleared (`inp.value=''`) *before* the API call to `/api/v1/lifeos/commitments` is made. `loadMITs()` is called after the API request, which would re-fetch the correct state.
    *   **Risk**: If the API call fails, the input is cleared, but the MIT is not added to the list. The user might perceive the task as added, only for it to disappear on a subsequent refresh or if `loadMITs` fails.
*   **Send Chat Message (`sendChat`)**:
    *   **Pattern**: The user's message is immediately appended to the chat messages (`#chat-messages`) with the `msg user` class *before* the API call to `/api/v1/lifeos/chat/threads/{id}/messages` is made.
    *   **Risk**: If the API call fails, the user's message will appear in the chat, but no assistant reply will follow. The `catch` block adds a generic "Something went wrong" message, but the user's message remains, potentially creating a confusing or unacknowledged interaction.

### 4. Empty States Copy Tone

Empty states provide feedback when a section has no data to display. The tone is generally informative, sometimes encouraging, and uses relevant emojis. Error states are distinct, using a warning emoji.

**Empty State Messages:**
*   **Today's MITs (`#mits-list`)**:
    *   **Empty**: `<span>✅</span>No MITs — add one below`
        *   *Tone*: Encouraging, proactive.
    *   **Error**: `<span>⚠️</span>Could not load tasks`
        *   *Tone*: Informative, warning.
*   **Today's Schedule (`#cal-list`)**:
    *   **Empty**: `<span>📅</span>Nothing scheduled today`
        *   *Tone*: Informative, neutral.
    *   **Error**: `<span>📅</span>Could not load schedule`
        *   *Tone*: Informative, neutral/warning.
*   **Goals (`#goals-list`)**:
    *   **Empty**: `<span>🎯</span>No goals set yet`
        *   *Tone*: Encouraging, proactive.
    *   **Error**: `<span>🎯</span>Could not load goals`
        *   *Tone*: Informative, warning.
*   **Life Scores (`#scores-grid`)**:
    *   **Error**: `<span>📊</span>Could not load scores`
        *   *Tone*: Informative, warning. (No explicit "empty" state, as scores default to 0).
*   **Chat with Lumin (`#chat-messages`)**:
    *   **Initial**: `Hey Adam 👋 — what's on your mind today?`
        *   *Tone*: Friendly, welcoming.
    *   **Error**: `Something went wrong — try again.` (Appended as an assistant message with `opacity:0.5`)
        *   *Tone*: Apologetic, suggestive of retry.
    *   **Ambient Nudge**: `🔔 Lumin: {message}`
        *   *Tone*: Informative, proactive, uses bell emoji.