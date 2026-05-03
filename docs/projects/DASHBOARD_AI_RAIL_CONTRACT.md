# Contract: Persistent AI Rail (Lumin Rail)

## Purpose
To provide a ubiquitous, quick-access AI interaction surface across the LifeOS platform, evolving the existing Lumin quick-drawer into a persistent, dockable component. This rail will offer streamlined voice and text interaction, with a clear path to the full chat experience.

## Key Capabilities
*   **UI States:**
    *   **Collapsed Strip:** A minimal, one-line UI element (e.g., status, quick input field).
    *   **Expanded Transcript:** A larger view displaying recent conversation history within the rail.
    *   **Docking:** Configurable positioning at the top or bottom of the screen.
*   **Interaction Parity:**
    *   **Voice Input:** Speech-to-text for user input, leveraging existing voice capabilities.
    *   **Text Input:** Standard keyboard input.
    *   **Voice Output:** Read-aloud (Text-to-Speech) for AI responses.
*   **Integration:**
    *   Seamless transition to the full `lifeos-chat.html` experience.
    *   Utilize existing `/api/v1/lifeos/chat` backend endpoints.
    *   Leverage `VM` (VoiceManager) from `lifeos-chat.html` or `LuminVoice` from `lifeos-app.html` for voice functionalities.
    *   Extend or replace the current `lumin-drawer` implementation in `lifeos-app.html`.

## Non-goals
*   Replicate all advanced features of `lifeos-chat.html` within the rail (e.g., full thread management, message search, build panel, message actions, detailed context bar, mode switching). The rail is a quick-access point, not a full replacement.
*   Introduce new backend API endpoints for core chat functionality.
*   Complex multi-thread management directly within the rail; focus on a single, dedicated "quick chat" thread initially.
*   Deep customization of AI models or personas from the rail itself.

## Phases

### Phase 1: Core UI & Text Interaction
1.  **Refactor `lumin-drawer`:** Modify `public/overlay/lifeos-app.html` to transform the existing Lumin drawer into a persistent rail container.
2.  **Implement UI States:** Develop CSS and JavaScript to support collapsed (one-line strip) and expanded (transcript view) states.
3.  **Docking Mechanism:** Implement logic for positioning the rail at the top or bottom of the screen (e.g., via a user setting or dynamic detection).
4.  **Text Input/Output:** Integrate existing `luminSend` and `_appendLuminMsg` logic for text-based conversation.
5.  **Full Chat Link:** Add a prominent "Open Full Chat" button or link to navigate to `lifeos-chat.html`.

### Phase 2: Voice Integration & Read-Aloud
1.  **Voice Input Integration:** Integrate `LuminVoice` (from `lifeos-app.html`) or a simplified `VM` instance for speech-to-text input directly into the rail.
2.  **Read-Aloud for AI:** Enable Text-to-Speech for AI responses within the rail, leveraging `VM.speak` or similar existing capabilities.
3.  **Voice/Text Parity:** Ensure that voice input is transcribed and displayed in the text input field, and that AI responses are available in both text and audio.

### Phase 3: Refinements & Context
1.  **Minimal Context Display:** Explore displaying minimal, relevant context (e.g., a small status indicator, MIT count) in the collapsed rail state.
2.  **UI/UX Refinement:** Enhance transitions between collapsed/expanded states and the full chat, ensuring a smooth user experience.
3.  **Advanced Command Handling:** Evaluate how build intents (`/plan`, `/draft`) and other advanced commands are handled from the rail (e.g., direct execution or prompting the user to open the full chat).

## Open Questions
*   How will the user's preference for top vs. bottom docking be configured and persisted?
*   What is the exact content and interaction model for the collapsed one-line strip (e.g., always-on input, status only, last message preview)?
*   What is the strategy for thread management within the rail (e.g., a single dedicated "quick chat" thread, or a mechanism to switch/create threads)?
*   How will build intents (`/plan`, `/draft`) and other specialized commands be supported or redirected from the persistent rail?
*   What is the detailed interaction model for voice input in the rail (e.g., push-to-talk, continuous listening with silence detection, explicit send)?