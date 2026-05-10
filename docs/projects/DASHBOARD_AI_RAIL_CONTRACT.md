# Contract: Persistent AI Rail (Lumin Rail)

## Purpose
To establish a ubiquitous, quick-access AI interaction surface across the LifeOS platform, evolving the existing Lumin quick-drawer into a persistent, dockable component. This rail will offer streamlined voice and text interaction, providing a direct path to the full chat experience.

## Key Capabilities
*   **UI States:**
    *   **Collapsed Strip:** A minimal, one-line UI element displaying status or a quick input field.
    *   **Expanded Transcript:** A larger view within the rail, showing recent conversation history.
    *   **Docking:** Configurable positioning at the top or bottom of the screen, persisting across sessions via `localStorage`.
*   **Interaction Parity:**
    *   **Voice Input:** Speech-to-text (STT) for user input, leveraging existing `window.LuminVoice` capabilities and the `lumin-input` field.
    *   **Text Input:** Standard keyboard input for messages, utilizing existing `luminSend` and `luminAutoResize` functions.
    *   **Voice Output:** Read-aloud (Text-to-Speech, TTS) for AI responses, extending `window.LuminVoice` with a `speak` method, with a visual indicator when Lumin is speaking.
*   **Integration:**
    *   Seamless transition to the full `lifeos-chat.html` experience via `openFullChat()`.
    *   Utilize existing `/api/v1/lifeos/chat` backend endpoints for message handling (`luminSend`).
    *   The global `Cmd/Ctrl+L` shortcut will toggle/focus the rail, extending its current behavior for `openLuminDrawer()`.
    *   The rail will manage its own dedicated "quick chat" thread, initialized by `luminBootThread()`.

## Non-goals
*   Replicate all advanced features of `lifeos-chat.html` within the rail (e.g., full thread management, message search, message actions, detailed context bar, mode switching, build panel). The rail is a quick-access point, not a full replacement.
*   Introduce new backend API endpoints for core chat functionality.
*   Complex multi-thread management directly within the rail; focus on a single, dedicated "quick chat" thread.
*   Deep customization of AI models or personas from the rail itself.

## Phases

### Phase 1: Core UI & Text Interaction
1.  **Refactor `lumin-drawer`:** Transform the existing `lumin-drawer` in `public/overlay/lifeos-app.html` into the persistent rail container, adapting its CSS for the new UI states (collapsed, expanded, docked).
2.  **Implement UI States:** Develop CSS and JavaScript to support collapsed (one-line strip) and expanded (transcript view) states, with smooth transitions.
3.  **Docking Mechanism:** Implement logic for user-configurable positioning of the rail at the top or bottom of the screen, persisting this preference in `localStorage`.
4.  **Text Input/Output:** Integrate existing `luminSend` and `_appendLuminMsg` logic for text-based conversation, displaying the last N messages in the expanded state.
5.  **Full Chat Link:** Add a clear UI element (e.g., a button or icon) within the rail to navigate to the full `lifeos-chat.html` page using `openFullChat()`.

### Phase 2: Voice Integration & Read-Aloud
1.  **Voice Input (STT):** Integrate `window.LuminVoice` for speech-to-text input directly into the rail's `lumin-input` field, providing visual feedback (e.g., a pulsing mic icon, `lumin-voice-interim` event handling).
2.  **Voice Output (TTS):** Extend `window.LuminVoice` to include a `speak` method that utilizes `SpeechSynthesisUtterance` for Text-to-Speech, enabling read-aloud for AI responses within the rail. Provide a visual indicator when Lumin is speaking.
3.  **Voice/Text Parity:** Ensure that voice input is transcribed and displayed in the text input field, and that AI responses are available in both text and audio.

### Phase 3: Refinements & Context
1.  **Minimal Context Display:** Explore displaying minimal, relevant context (e.g., a small status indicator, MIT count, or a simplified "Ready" / "Thinking" status) in the collapsed rail state.
2.  **UI/UX Refinement:** Enhance animations and interactions for toggling states, docking, and transitioning to the full chat, ensuring a polished user experience.
3.  **Advanced Command Handling:** Define the behavior for build intents (`/plan`, `/draft`) and other specialized commands entered in the rail; options include redirecting to the full chat with a pre-filled input or providing a simplified execution flow if appropriate.

## Open Questions
*   What is the exact content and interaction model for the collapsed one-line strip (e.g., always-on input, status only, last message preview, or a combination)?
*   How will the rail handle multiple concurrent voice inputs if the user is also interacting with other voice-enabled parts of LifeOS?
*   What level of configuration (e.g., voice, silence timeout) should be exposed directly within the rail, versus requiring navigation to the full chat settings?