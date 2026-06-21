<!-- SYNOPSIS: Amendment 01: AI Council Proof - G1003-100 - Initial Decision Logging -->

# Amendment 01: AI Council Proof - G1003-100 - Initial Decision Logging

## Objective

This document outlines the proof-of-concept for establishing a foundational logging mechanism for AI Council-related events within the BuilderOS internal audit system. The primary goal is to demonstrate the capability to record AI-driven decisions or recommendations, ensuring operational transparency and auditability for future AI Council integrations. This proof specifically targets the initial integration point for AI Council output into BuilderOS's existing internal event and logging infrastructure.

## Proof-Closing Blueprint Note

1.  **Exact missing implementation or proof gap:** The BuilderOS internal event and audit logging system currently lacks a dedicated, structured event type and corresponding handler for AI Council-generated decisions or recommendations. The gap is the absence of a defined schema and persistence mechanism for these specific AI-driven events, preventing their systematic capture for audit and review.

2.  **Smallest safe build slice to close it:**
    *   Define a new internal event type, `AICouncilDecisionEvent`, with a clear payload structure (e.g., `decisionId`, `timestamp`, `sourceAI`, `decisionType`, `relatedEntities`, `payload`).
    *   Implement a minimal event emitter function within a new or existing AI Council utility module that can generate and dispatch `AICouncilDecisionEvent` instances.
    *   Extend the existing BuilderOS internal audit logger to recognize `AICouncilDecisionEvent` and persist its structured payload to the designated internal audit trail (e.g., a specific log file or database table). This slice focuses solely on event definition, emission, and persistence, without implementing any complex AI decision logic itself.

3.  **Exact safe-scope files to touch first:**
    *   `src/internal/events/types.js`: Add the `AICouncilDecisionEvent` type definition and its expected payload schema.
    *   `src/internal/audit/logger.js`: Modify or extend the `logEvent` function to include handling for `AICouncilDecisionEvent`, ensuring its structured persistence.
    *   `src/internal/ai-council/utils.js` (or `src/internal/ai-council/eventEmitter.js` if new): Create or modify this file to include a function, e.g., `emitAICouncilDecision(decisionPayload)`, which constructs and dispatches the `AICouncilDecisionEvent`.

4.  **Verifier/runtime checks:**
    *   **Unit Test (`src/internal/events/types.test.js`):** Verify that `AICouncilDecisionEvent` is correctly defined and its schema validates expected payloads.
    *   **Unit Test (`src/internal/audit/logger.test.js`):** Simulate the emission of an `AICouncilDecisionEvent` and assert that the `logger.js` correctly processes and attempts to persist it (e.g., by mocking the underlying persistence layer and checking calls).
    *   **Integration Test (`src/internal/ai-council/utils.test.js`):** Write a test that calls `emitAICouncilDecision` with a dummy payload and then queries the internal audit log (or a mock thereof) to confirm the event's presence, correct structure, and content.
    *   **Manual Check (Dev Environment):** Trigger the `emitAICouncilDecision` function via a temporary script or a development API endpoint. Inspect the BuilderOS internal audit log (e.