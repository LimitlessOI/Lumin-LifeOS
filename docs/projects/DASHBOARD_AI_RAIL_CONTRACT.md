<!-- SYNOPSIS: Technical Contract: Persistent AI Rail -->

# Technical Contract: Persistent AI Rail

This document outlines the technical contract for the Persistent AI Rail, a new core UI component designed to provide ubiquitous access to Lumin's AI capabilities across the LifeOS platform.

## Contract

The Persistent AI Rail will provide a consistent, always-available interface for interacting with Lumin, integrating seamlessly with existing chat and voice functionalities.

### Core Functionality

1.  **UI States:**
    *   **Collapsed Strip:** A minimal, one-line UI element docked at either the top or bottom of the screen. This strip will display the latest Lumin response or a status indicator.
    *   **Expanded Transcript:** An expandable view revealing a scrollable history of the current Lumin conversation, similar to the existing Lumin quick chat drawer.
2.  **Interaction Parity:**
    *   **Voice Input:** Users can initiate voice input directly from the rail in both collapsed and expanded states. This will leverage and extend the existing `LuminVoice` (or `VM`) capabilities for speech-to-text.
    *   **Text Input:** A text input field will be available in the expanded state, and potentially a quick-entry mechanism in the collapsed state. This will utilize the existing `luminSend` mechanism.
3.  **Read-Aloud (TTS):** Lumin's responses within the rail will have an option for read-aloud functionality, leveraging the existing `VM.speak` capability. This can be user-triggered or configurable for automatic playback.
4.  **Persistent Context:** The rail will maintain context with a single, active Lumin conversation thread, consistent with the `luminState.threadId` management. It will boot or create a thread if none exists, similar to `luminBootThread`.

### Relationship to Existing Lumin/Chat Entry Points

*   **Lumin Quick Chat (`lumin-drawer` in `lifeos-app.html`):** The Persistent AI Rail will supersede the existing `lumin-drawer` and `lumin-quick-bar` as the primary quick-access Lumin interface. The `lumin-drawer` will be deprecated or refactored to become the expanded state of the rail.
*   **Full Chat Page (`lifeos-chat.html`):** The Persistent AI Rail will complement, not replace, the full `lifeos-chat.html` page. Users will be able to transition from the rail's expanded view to the full chat page for more detailed thread management and features.
*   **VoiceManager (`VM` in `lifeos-chat.html` / `LuminVoice` in `lifeos-app.html`):** The core speech-to-text and text-to-speech logic from `VM` (or the `LuminVoice` abstraction used in `lifeos-app.html`) will be integrated into the Persistent AI Rail to provide voice input and read-aloud capabilities. This implies making `LuminVoice` globally accessible or ensuring its availability within `lifeos-app.html`.
*   **Backend API (`/api/v1/lifeos/chat`):** The rail will continue to use the existing chat API endpoints for thread management and message sending (`luminBootThread`, `luminCreateThread`, `luminLoadMessages`, `luminSend`).

## Non-goals

*   Replacing the full `lifeos-chat.html` page's advanced features (e.g., thread filtering, message actions like pin/react, search within threads).
*   Implementing new backend API endpoints for chat functionality.
*   Complex multi-modal input beyond voice and text.
*   Deep integration with other LifeOS features beyond what is currently supported by the chat API (e.g., direct manipulation of MITs or other domain objects from the rail's input).

## Phases

### Phase 1: Basic Collapsed Strip & Text Input

*   **UI:** Implement a fixed-position, collapsed strip at the bottom of `lifeos-app.html`.
*   **Content:** Display the latest Lumin response or a "Ready" status.
*   **Interaction:** Allow quick text input directly into the strip, sending messages via `luminSend`.
*   **Expansion:** A button or gesture to expand the strip into a basic transcript view.
*   **Backend:** Leverage existing `luminBootThread`, `luminLoadMessages`, `luminSend`.

### Phase 2: Expanded Transcript & Voice Integration

*   **UI:** Develop the expanded view to show a scrollable conversation history, similar to the current `lumin-drawer`.
*   **Voice Input:** Integrate `LuminVoice` for speech-to-text in both collapsed (e.g., via a mic button) and expanded states. Implement auto-send after silence.
*   **Read-Aloud:** Integrate `LuminVoice.speak` to provide read-aloud functionality for Lumin's responses.
*   **Parity:** Ensure a consistent user experience when switching between text and voice input/output.

### Phase 3: UI Refinements & Docking Options

*   **Docking:** Implement user-configurable options to dock the rail at the top or bottom of the screen.
*   **Visual Polish:** Refine animations, transitions, and overall aesthetic to blend seamlessly with LifeOS.
*   **Settings:** Expose relevant voice settings (e.g., speed, voice selection) within the rail's UI, potentially reusing `VM`'s settings panel.
*   **Transition to Full Chat:** Implement a clear affordance to open the current conversation in the full `lifeos-chat.html` page.

## Open Questions

*   **Initial State:** What is the default visibility and docking position of the rail on first load?
*   **Thread Management:** Will the rail always operate on the single "latest" or "quick chat" thread, or will there be a mechanism to switch between recent threads directly from the rail?
*   **Read-Aloud Trigger:** Will read-aloud be automatic for all AI responses, or user-triggered (e.g., a play button per message)?
*   **UI Integration:** How will the rail visually interact with other fixed UI elements in `lifeos-app.html` (e.g., the main navigation bar, quick capture)?
*   **`LuminVoice` Availability:** How will `window.LuminVoice` be ensured to be available and initialized within `lifeos-app.html` for the rail's voice features, given `VM` is currently defined in `lifeos-chat.html`?