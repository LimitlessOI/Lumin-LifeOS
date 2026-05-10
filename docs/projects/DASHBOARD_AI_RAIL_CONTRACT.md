# Contract: Persistent AI Rail (Lumin Rail)

## Purpose
To establish a ubiquitous, quick-access AI interaction surface across the LifeOS platform, evolving the existing Lumin quick-drawer into a persistent, dockable component. This rail will offer streamlined voice and text interaction, providing a direct path to the full chat experience.

## Key Capabilities
*   **UI States:**
    *   **Docking:** User-configurable positioning at either the top or bottom of the screen. This preference will be persisted across sessions using `localStorage` (e.g., `lifeos_lumin_rail_dock_position`).
    *   **Collapsed Strip:** A minimal, one-line UI element (e.g., ~40px height) displaying a concise status (e.g., "Lumin: Ready", "Lumin: Thinking...") or a quick input field for immediate text/voice interaction.
    *   **Expanded Transcript:** A larger view within the rail (e.g., ~200-300px height), displaying a scrollable history of recent conversation messages (e.g., last 5-10 messages).
*   **Interaction Parity:**
    *   **Voice Input (Speech-to-Text - STT):** Leverage the existing `window.LuminVoice` utility to enable speech input directly into the rail's `lumin-input` field. This includes displaying interim transcript text and providing visual feedback (e.g., a pulsing mic icon) when active.
    *   **Text Input:** Utilize the existing `luminSend` function for sending messages and `luminAutoResize` for managing the input `textarea`'s height.
    *   **Voice Output (Text-to-Speech - TTS):** Extend the `window.LuminVoice` utility to include a `speak(text)` method, which will use `SpeechSynthesisUtterance` to read aloud AI responses. A visual indicator (e.g., a small speaker icon or status text) will be present when Lumin is speaking.
*   **Integration:**
    *   **Full Chat Transition:** A clear UI element (e.g., a button or icon) within the expanded rail will trigger `openFullChat()`, seamlessly navigating the user to the `lifeos-chat.html` page while preserving the current conversation context.
    *   **Backend Endpoints:** Continue to use the existing `/api/v1/lifeos/chat` backend endpoints for all message handling, thread management, and status updates (`luminSend`, `luminLoadMessages`, `luminCreateThread`, `luminBootThread`).
    *   **Global Shortcut:** The existing `Cmd/Ctrl+L` keyboard shortcut will be extended to toggle the visibility of the Lumin Rail and focus its input field, building upon its current behavior for `openLuminDrawer()`.
    *   **Dedicated Thread:** The rail will operate on a single, dedicated "quick chat" thread, initialized by `luminBootThread()` to ensure a consistent and focused interaction.

## Non-goals
*   Replicate all advanced features of `lifeos-chat.html` within the rail. This includes, but is not limited to, full thread management (listing, filtering, creating new threads), message search, message actions (pin, react, copy), detailed context bar, mode switching, or the build panel. The rail is designed for quick, focused interaction.
*   Introduce new backend API endpoints for core chat functionality.
*   Implement complex multi-thread management directly within the rail.
*   Provide deep customization of AI models or personas from the rail itself.
*   Expose all voice settings (e.g., rate, voice selection, silence timeout) directly within the rail; these will remain configurable in the full chat's `VM` settings.

## Phases

### Phase 1: Core UI & Text Interaction
1.  **Refactor `lumin-drawer`:** Modify the HTML structure and CSS of the existing `lumin-drawer` in `public/overlay/lifeos-app.html` to function as a persistent rail container, supporting flexible positioning and sizing.
2.  **Implement UI States:** Develop JavaScript and CSS to manage the visual transitions between the collapsed (minimal height) and expanded (transcript view) states of the rail, ensuring smooth animations.
3.  **Docking Mechanism:** Implement JavaScript logic to allow users to toggle the rail's position between the top and bottom of the viewport. Store this preference in `localStorage` (e.g., `lifeos_lumin_rail_dock_position`) and apply it on boot.
4.  **Text Input/Output:** Integrate the existing `luminSend` function for sending messages and `_appendLuminMsg` for rendering responses. Display the last N (e.g., 5-10) messages in the expanded rail view, ensuring `luminAutoResize` correctly adjusts the rail's input `textarea`.
5.  **Full Chat Link:** Add a clearly identifiable UI element (e.g., an "Open Full Chat" button or icon) within the expanded rail that invokes `openFullChat()` to transition to the full `lifeos-chat.html` interface.

### Phase 2: Voice Integration & Read-Aloud
1.  **Voice Input (STT):** Integrate `window.LuminVoice.startForInput()` with the rail's `lumin-input` field. Implement visual feedback for active listening, such as a pulsing microphone icon and displaying interim transcript text via the `lumin-voice-interim` event.
2.  **Voice Output (TTS):** Extend the `window.LuminVoice` utility to include a `speak(text)` method. This method will utilize `SpeechSynthesisUtterance` to read aloud AI responses received in the rail. Implement a visual indicator (e.g., a small speaker icon or status text) to show when Lumin is actively speaking.
3.  **Voice/Text Parity:** Ensure that messages sent via voice are accurately transcribed and displayed in the rail's transcript, and that AI responses are consistently available for both visual reading and audio playback.

### Phase 3: Refinements & Context
1.  **Minimal Context Display:** In the collapsed state, display a concise status (e.g., "Lumin: Ready", "Lumin: Thinking...", or a truncated preview of the last AI response).
2.  **UI/UX Refinement:** Polish animations for docking, expanding/collapsing, and message flow. Ensure the rail is responsive and accessible across various screen sizes and input methods.
3.  **Advanced Command Handling:** Define the behavior for build intents (`/plan`, `/draft`, `/queue`) when entered in the rail's input. The initial approach will be to either block these commands with a message prompting the user to use the full chat, or to redirect to the full chat with the command pre-filled in the input.

## Open Questions
*   What is the preferred default docking position (top or bottom) for first-time users, and how is this preference initially set?
*   Should the rail automatically collapse after a period of user inactivity, or should it maintain its last expanded/collapsed state until explicitly changed?
*   How should the rail visually indicate new incoming messages when it is in the collapsed state (e.g., a badge, a subtle animation, or a brief expansion)?
*   What is the precise behavior for build intents (`/plan`, `/draft`, `/queue`) when entered in the rail? Should they be blocked, redirect to the full chat with the command pre-filled, or is a simplified execution flow within the rail feasible and desired?