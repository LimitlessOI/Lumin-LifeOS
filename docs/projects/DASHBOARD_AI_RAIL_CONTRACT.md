# Technical Contract: Persistent AI Rail

This document outlines the technical contract for the Persistent AI Rail, a new cross-cutting UI component designed to provide ubiquitous access to AI capabilities within the LifeOS dashboard.

## Contract

The Persistent AI Rail will be a dynamic UI element offering continuous AI interaction. Its core features include:

1.  **Docking Flexibility:** The rail will be capable of docking to either the top or bottom of the primary dashboard viewport, allowing users to choose their preferred placement.
2.  **Collapsed State:** In its minimal state, the rail will present as a collapsed one-line strip, providing a subtle presence without obstructing primary content. This strip will likely include a prompt entry field and an indicator of AI activity.
3.  **Expanded Transcript View:** Upon user interaction (e.g., clicking the strip, typing a command), the rail will expand to reveal a full transcript view, similar to a chat interface, displaying the history of interactions with the AI.
4.  **Voice/Text Parity:** The rail will support both voice and text input methods, ensuring that all AI interactions initiated via voice have a corresponding text representation in the transcript, and vice-versa. Output from the AI will also be available in both text and, optionally, voice.
5.  **Read-Aloud Functionality:** The AI's responses within the expanded transcript view will include a "read-aloud" option, allowing users to listen to the AI's output.

**Relationship to Existing Lumin/Chat Entry Points:**
The Persistent AI Rail is intended as an *additional* and *always-available* interaction surface. It will leverage the same underlying AI services and APIs as existing Lumin and other chat entry points. This means:
-   All AI requests originating from the rail will route through the established `config/task-model-routing.js` and interact with the Council via existing service patterns.
-   The rail will not introduce new AI models or direct AI integrations that bypass the Council.
-   It will respect existing authentication, authorization, and rate-limiting middleware (`mw/apply-mw.js`).

**What Must Not Break:**
-   **Existing AI Service Integrations:** The underlying AI service calls and their routing via `config/task-model-routing.js` must remain fully functional and unchanged by the introduction of the rail.
-   **Lumin and Other Chat UIs:** Any existing Lumin or dedicated chat interfaces must continue to operate without disruption or change in behavior. The AI rail is additive, not a replacement.
-   **Platform Core Stability:** The introduction of the AI rail must not negatively impact the stability, performance, or security of the core platform. This includes `server.js`, middleware, and startup sequences.
-   **Authentication and Authorization:** All existing authentication and authorization mechanisms must be respected and enforced for interactions initiated through the AI rail.
-   **Build System Endpoints:** All builder endpoints (e.g., `/api/v1/lifeos/builder/build`, `/api/v1/lifeos/builder/task`) must remain fully operational and unaffected.

## Non-goals

-   **Replacement of Existing Chat UIs:** The AI rail is not intended to deprecate or replace any existing dedicated chat or Lumin interfaces.
-   **New AI Model Integration:** This project does not involve integrating new AI models or providers. It leverages existing Council configurations.
-   **Offline Functionality:** Initial scope does not include offline interaction capabilities for the AI rail.
-   **Deep Contextual Awareness (beyond current capabilities):** While the rail provides persistent access, its contextual memory will be limited by the current capabilities of the underlying AI services. It will not introduce new mechanisms for long-term memory or complex conversational state management beyond what is already supported.

## Phases

1.  **Phase 1: Core UI Shell & Text Interaction (MVP)**
    *   Implement the basic UI shell for the rail (collapsed and expanded states).
    *   Enable text input and display of text responses.
    *   Integrate with existing AI service endpoints for text-based queries.
    *   Implement docking (e.g., bottom-only initially).
2.  **Phase 2: Voice Input & Parity**
    *   Add voice input capabilities (speech-to-text).
    *   Ensure text transcript accurately reflects voice input.
    *   Integrate with AI services using voice-derived text.
3.  **Phase 3: Read-Aloud & Docking Flexibility**
    *   Implement text-to-speech for AI responses.
    *   Add read-aloud controls to the transcript.
    *   Enable dynamic docking to top/bottom.
4.  **Phase 4: Polish & Performance**
    *   Refine UI/UX.
    *   Optimize performance and resource usage.
    *   Comprehensive testing and bug fixing.

## Open Questions

-   **Persistence Mechanism:** How will the rail's state (e.g., expanded/collapsed, docking position) be persisted across user sessions? (e.g., local storage, user preferences service).
-   **Notification Strategy:** How will the rail indicate new AI responses when in its collapsed state, especially if the user is focused on other dashboard elements?
-   **Accessibility:** What specific accessibility requirements beyond voice/text parity and read-aloud need to be addressed for the UI component?
-   **Error Handling & Feedback:** How will errors from AI services or network issues be communicated to the user via the rail?
-   **Integration with Domain-Specific Context:** Will the AI rail have access to the context of the currently active dashboard domain/view to provide more relevant AI assistance? If so, how will this context be passed?