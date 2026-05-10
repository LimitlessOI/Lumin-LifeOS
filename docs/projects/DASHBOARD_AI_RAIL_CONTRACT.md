# Contract: Persistent AI Rail (Lumin Rail)

## Purpose
To establish a ubiquitous, quick-access AI interaction surface across the LifeOS platform, evolving the existing Lumin quick-drawer into a persistent, dockable component. This rail will offer streamlined voice and text interaction, providing a direct path to the full chat experience.

## Key Capabilities
*   **UI States:**
    *   **Collapsed Strip:** A minimal, one-line UI element displaying status (e.g., "Ready", "Thinking") or a quick input field for immediate interaction.
    *   **Expanded Transcript:** A larger view within the rail, showing recent conversation history (e.g., last 5-10 messages) for context.
    *   **Docking:** Configurable positioning at the top or bottom of the screen, persisting across sessions via `localStorage` to remember user preference.
*   **Interaction Parity:**
    *   **Voice Input:** Speech-to-text (STT) for user input, leveraging existing `window.LuminVoice` capabilities and routing input to the `lumin-input` field. Visual feedback (e.g., a pulsing mic icon, interim text display) will indicate active listening.
    *   **Text Input:** Standard keyboard input for messages, utilizing existing `luminSend` and `luminAutoResize` functions for sending and managing the input area.
    *   **Voice Output:** Read-aloud (Text-to-Speech, TTS) for AI responses, extending `window.LuminVoice` with a `speak` method that uses `SpeechSynthesisUtterance`. A visual indicator will show when Lumin is speaking.
*   **Integration:**
    *   Seamless transition to the full `lifeos-chat.html` experience via `openFullChat()`, preserving the current conversation context.
    *   Utilize existing `/api/v1/lifeos/chat` backend endpoints for message handling (`luminSend`, `luminLoadMessages`, etc.).
    *   The global `Cmd/Ctrl+L` shortcut will be extended to toggle the rail's visibility and focus its input field, building upon its current behavior for `openLuminDrawer()`.
    *   The rail will manage its own dedicated "quick chat" thread, initialized by `luminBootThread()` to ensure continuity.

## Non-goals
*   Replicate all advanced features of `lifeos-chat.html` within the rail (e.g., full thread management, message search, message actions like pin/react, detailed context bar, mode switching, build panel). The rail is a quick-access point, not a full replacement.
*   Introduce new backend API endpoints for core chat functionality.
*   Complex multi-thread management directly within the rail; focus on a single, dedicated "quick chat" thread.
*   Deep customization of AI models or personas from the rail itself.
*   Implement new voice settings (rate, voice selection, silence timeout) directly in the rail; these will remain in the full chat's `VM` settings.

## Phases

### Phase 1: Core UI & Text Interaction
1.  **Refactor `lumin-drawer`:** Adapt the existing `lumin-drawer` element in `public/overlay/lifeos-app.html` and its associated CSS to serve as the base container for the persistent rail, supporting flexible positioning and sizing.
2.  **Implement UI States:** Develop CSS and JavaScript to manage the visual transitions between a collapsed (minimal height, e.g., 40px) and expanded (showing recent messages, e.g., 200-300px height) state for the rail.
3.  **Docking Mechanism:** Implement JavaScript logic to allow users to toggle the rail's position between the top and bottom of the viewport. Store this preference in `localStorage` (e.g., `lifeos_lumin_rail_dock_position`).
4.  **Text Input/Output:** Integrate the existing `luminSend` function for sending messages and `_appendLuminMsg` for rendering responses. Display the last N (e.g., 5-10) messages in the expanded rail view, ensuring `luminAutoResize` works for the rail's input.
5.  **Full Chat Link:** Add a prominent UI element (e.g., an "Open Full Chat" button or icon) within the expanded rail that calls `openFullChat()` to navigate to `lifeos-chat.html`.

### Phase 2: Voice Integration & Read-Aloud
1.  **Voice Input (STT):** Integrate `window.LuminVoice.startForInput()` with the rail's `lumin-input` field. Provide visual feedback for active listening (e.g., a dedicated mic icon in the rail's input area that pulses, and display of interim transcript via `lumin-voice-interim` event).
2.  **Voice Output (TTS):** Extend `window.LuminVoice` (or create a new `LuminRailVoice` module if separation is cleaner) to include a `speak(text)` method. This method will utilize `SpeechSynthesisUtterance` to read out AI responses. A visual indicator (e.g., a small speaker icon or status text) will show when Lumin is speaking.
3.  **Voice/Text Parity:** Ensure that messages sent via voice are transcribed and appear in the rail's transcript, and that AI responses are consistently available for both visual reading and audio playback.

### Phase 3: Refinements & Context
1.  **Minimal Context Display:** In the collapsed state, display a concise status (e.g., "Lumin: Ready" or "Lumin: Thinking...") or a preview of the last AI response. In the expanded state, consider a simplified version of the `context-bar` from `lifeos-chat.html` if relevant and non-intrusive.
2.  **UI/UX Refinement:** Polish animations for docking, expanding/collapsing, and message flow. Ensure accessibility and responsiveness across different screen sizes.
3.  **Advanced Command Handling:** Define how build intents (`/plan`, `/draft`, `/queue`) entered in the rail's input are handled. The initial approach will be to either block them with a message to use the full chat, or to redirect to the full chat with the command pre-filled.

## Open Questions
*   What is the preferred default docking position (top or bottom) for first-time users?
*   Should the rail automatically collapse after a period of inactivity, or remain in its last state?
*   How should the rail visually indicate new messages when it is in the collapsed state (e.g., a badge, a subtle animation)?
*   What is the desired behavior for build intents (`/plan`, `/draft`, `/queue`) when entered in the rail? Should they be blocked, redirect to full chat, or have a simplified execution flow within the rail?