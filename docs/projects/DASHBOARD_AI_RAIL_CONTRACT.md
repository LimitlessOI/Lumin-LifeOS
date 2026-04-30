# Technical Contract: Lumin Persistent AI Rail

## Contract

**Feature Name:** Lumin Persistent AI Rail

**Description:** The Lumin Persistent AI Rail provides an "always-on" AI presence within the LifeOS shell, offering quick access to Lumin AI interaction through a dockable UI component. It supports both text and voice input/output, with distinct collapsed and expanded states, aiming for seamless integration with existing Lumin chat functionalities.

**Key Capabilities:**

*   **Docking:** The rail will be positionable at either the top or bottom of the main LifeOS application viewport.
*   **Collapsed State:** A minimal, one-line strip displaying Lumin's status (e.g., "Ready," "Listening," "Thinking") or a snippet of the last interaction.
*   **Expanded State:** Reveals a scrollable transcript-like view of recent Lumin interactions, including a multi-line text input field.
*   **Voice/Text Parity:** Ensures a consistent user experience regardless of whether input is provided via text or voice, and AI responses are delivered in both modalities (text display and optional read-aloud).
*   **Read-Aloud:** AI responses within the rail can be audibly read using text-to-speech (TTS) capabilities, leveraging the existing `VM.speak` functionality.
*   **Integration with Existing Lumin Chat:** The rail will leverage the existing `luminState` (for thread management and message sending) and `VM` (VoiceManager) from `lifeos-app.html` and `lifeos-chat.html` respectively. It will use `luminSend`, `_appendLuminMsg`, `_appendLuminMsgRaw`, `luminBootThread`, `luminLoadMessages`, and `luminAutoResize`.
*   **Global Voice Input:** Integrates with the `toggleAlwaysListen` functionality, allowing system-wide voice input to be routed to and processed by the rail.
*   **Full Chat Launch:** Provides a clear and accessible entry point to transition from the rail to the full `lifeos-chat.html` experience via `openFullChat`.

## Non-goals

*   Re-implementing core chat logic (e.g., thread creation, message storage, message history retrieval) that is already robustly handled by the existing `lumin` drawer functions in `lifeos-app.html` or the full `lifeos-chat.html`.
*   Supporting complex multi-modal input beyond text and voice (e.g., image, video uploads, file attachments).
*   Offering deep customization of AI agent personalities or modes directly within the collapsed or one-line rail interface; this functionality remains primarily within the full chat experience.
*   Providing offline AI interaction capabilities; the rail will require network connectivity for AI processing.
*   Implementing extensive UI customization options for the rail's appearance beyond its defined collapsed/expanded states and docking positions.

## Phases

**Phase 1: Core UI & Text Interaction (MVP)**

1.  **UI Development:** Implement the HTML and CSS for the dockable rail, defaulting to a bottom-docked position. This includes the collapsed one-line strip and the expanded transcript view with a text input.
2.  **State Management:** Develop the JavaScript logic for transitioning between the collapsed (one-line strip) and expanded (transcript + input) UI states.
3.  **Text Input/Output:** Wire the rail's text input field to the existing `luminSend` function and display AI responses using `_appendLuminMsg` and `_appendLuminMsgRaw`. Ensure `luminAutoResize` is applied to the rail's input.
4.  **Thread Initialization:** Ensure the rail correctly utilizes `luminBootThread` and `luminLoadMessages` to display relevant conversation history upon opening the expanded view, using `luminState.threadId`.
5.  **Full Chat Access:** Implement a clear UI element within the rail to launch the full `lifeos-chat.html` interface via `openFullChat`.

**Phase 2: Voice Integration & Read-Aloud**

1.  **Voice Input Integration:** Integrate the `VM` (VoiceManager) or a dedicated voice input mechanism into the rail, enabling users to provide input via speech. This will involve adapting `VM.startListening` or a similar mechanism for the rail's input.
2.  **Read-Aloud Functionality:** Enable text-to-speech for Lumin's responses within the rail, leveraging `VM.speak` for audible feedback.
3.  **Global Voice Sync:** Connect the rail's voice input to the `toggleAlwaysListen` functionality, allowing voice commands from anywhere in LifeOS to be routed to the rail's input and processed by `luminSend`.
4.  **Voice Status Display:** Implement UI elements within the rail to clearly indicate the current voice status (e.g., "Listening," "Speaking," "Ready") by adapting `VM.setStatus` or similar.

**Phase 3: UI/UX Refinements & Docking Options**

1.  **Docking Configuration:** Add user-configurable options to select the rail's docking position (top or bottom).
2.  **Animation & Transitions:** Refine UI animations and transitions for a smooth and polished user experience between states and docking positions.
3.  **Persistent Preferences:** Implement local storage to remember the user's preferred rail state (collapsed/expanded) and docking position across sessions.
4.  **Accessibility:** Enhance accessibility features, including keyboard navigation and screen reader support for the rail.

## Open Questions

*   **Thread Management:** Given that `luminState` currently manages a single `threadId`, how will the persistent rail handle scenarios involving multiple active threads? Will it always default to the most recent thread, or will there be a mechanism for quick thread switching within the rail?
*   **Visual Design Details:** What are the precise visual specifications for the collapsed strip (e.g., maximum character limit, content displayed) and the expanded transcript view (e.g., number of messages initially shown, specific scroll behavior, message grouping)?
*   **Top Docking Impact:** If the rail is docked at the top, how will this affect the layout and interaction with other primary LifeOS UI elements, such as the main content area and global navigation?
*   **Voice Settings Synchronization:** Will the voice input and output settings (e.g., silence timeout, speech rate, selected voice) used by the rail be synchronized with the `VM` settings in the full `lifeos-chat.html`, or will they operate independently?
*   **Performance & Battery Implications:** What are the expected performance and battery consumption implications of maintaining an "always-on" voice listening capability, especially when the rail is collapsed or the LifeOS application is in the background? What safeguards will be implemented?
*   **Notification/Badge Logic:** How will new messages or important updates from Lumin be indicated when the rail is in its collapsed state, beyond the existing `lumin-fab-badge`?