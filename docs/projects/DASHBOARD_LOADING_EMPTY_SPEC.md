## UI State Specification for LifeOS Dashboard

This specification outlines patterns for skeletons, shimmer rules, optimistic UI risks, and empty states copy tone, primarily derived from the existing `public/overlay/lifeos-dashboard.html` given the absence of the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`.

### 1. Skeletons

**Purpose:** To provide visual feedback during data loading, indicating that content is expected and in progress, rather than missing.

**Existing Patterns:**
- **CSS Classes:**
    - `.skeleton`: Applies the shimmer animation and base gradient background.
    - `.skel-line`: Defines a rectangular placeholder line with a default height of `14px` and `margin-bottom: 10px`.
- **Usage:**
    - Used for lists of items (MITs, Calendar, Goals) as multiple `.skel-line` elements with varying `width` (e.g., `w-full`, `w-4/5`, `w-3/5`) to simulate text lines.
    - Used for circular elements (Scores) by applying `.skeleton` to a `div` with `width:72px;height:72px;border-radius:50%`.
- **Styling:**
    - `background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);`
    - `background-size: 400px 100%;`
    - `border-radius: var(--radius-sm);` (or `50%` for circular)

### 2. Shimmer Rules

**Purpose:** To create a subtle animation effect on skeleton loaders, enhancing the perception of activity and reducing perceived wait times.

**Existing Patterns:**
- **CSS Animation:**
    - `@keyframes shimmer`:
        ```css
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        ```
- **Application:**
    - Applied via the `.skeleton` class: `animation: shimmer 1.4s infinite;`
    - The `background-size` of `400px 100%` combined with the `background-position` animation creates the left-to-right "shimmer" effect across the gradient.

### 3. Optimistic UI Risks

**Context:** Without the `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, specific optimistic UI requirements are unknown. The following are general risks based on interactive elements in `lifeos-dashboard.html`.

**Identified Risks:**
- **MITs (Add/Toggle):**
    - **Risk:** A user adds a new MIT or toggles an existing one as "done". The UI updates immediately, but the API call to `/api/v1/lifeos/commitments` or `/api/v1/lifeos/commitments/{id}/keep` fails.
    - **Outcome:** The user sees a successful state (MIT added/toggled) that is not persisted on the backend. This leads to data inconsistency and user frustration when the state reverts or is not reflected on refresh.
- **Chat (Send Message):**
    - **Risk:** A user sends a message to Lumin. The message is immediately appended to the chat history on the UI, but the API call to `/api/v1/lifeos/chat/threads/{threadId}/messages` fails.
    - **Outcome:** The user believes their message was sent, but Lumin never received it. This breaks the conversation flow and can lead to lost input. The current implementation handles this by showing an "Something went wrong" message, but the user's message remains in the UI.
- **General Data Modification:**
    - **Risk:** Any future interactive elements that modify data (e.g., editing goals, updating scores directly) could face similar issues if optimistic updates are not carefully managed.
    - **Mitigation (Current):** The existing dashboard primarily fetches data on load and does not appear to use optimistic updates for scores or goals, reducing risk in these areas. MITs and Chat are the primary areas where optimistic UI could be considered.

**Recommendation:** For any optimistic UI implementation, ensure robust error handling and clear visual feedback for failures (e.g., temporary "sending..." states, clear error messages, or automatic rollback of optimistic changes).

### 4. Empty States Copy Tone

**Purpose:** To inform the user when a section has no data, and often to guide them on how to populate it.

**Existing Tone & Patterns:**
- **General Tone:** Helpful, encouraging, slightly informal, and clear.
- **Structure:** Typically includes an emoji, a concise message, and sometimes a call to action.
- **Examples from `lifeos-dashboard.html`:**
    - **MITs (No data):** `<span>✅</span>No MITs — add one below`
    - **MITs (Error):** `<span>⚠️</span>Could not load tasks`
    - **Calendar (No data):** `<span>📅</span>Nothing scheduled today`
    - **Calendar (Error):** `<span>📅</span>Could not load schedule`
    - **Goals (No data):** `<span>🎯</span>No goals set yet`
    - **Goals (Error):** `<span>🎯</span>Could not load goals`
    - **Scores (Error):** `<span>📊</span>Could not load scores`
- **Key Characteristics:**
    - **Emoji Use:** Consistent use of relevant emojis (✅, 📅, 🎯, 📊, ⚠️) to add visual interest and convey meaning quickly.
    - **Direct Language:** Clear and unambiguous statements about the current state.
    - **Action-Oriented (for no data):** When applicable, suggests how the user can change the empty state (e.g., "add one below", "set yet").
    - **Empathetic (for errors):** Acknowledges the failure without assigning blame, e.g., "Could not load...".
    - **Concise:** Messages are short and to the point.

**Recommendation:** Maintain this established tone and pattern for any new empty states or error messages introduced in the dashboard.
The specification is incomplete as the source brief `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was not found.