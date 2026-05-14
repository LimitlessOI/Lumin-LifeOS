# Client-Visible API Error Envelopes Specification

## 1. Purpose
This specification defines the standard structure, content, and behavior for client-visible error messages resulting from API failures within the LifeOS Dashboard. The goal is to provide clear, actionable feedback to users while maintaining privacy and facilitating debugging for authorized personnel.

## 2. General Principles
*   **User-Centric Copy**: Error messages must be clear, concise, and actionable for the end-user. Avoid technical jargon.
*   **Privacy (Fail-Closed)**: No sensitive system details (e.g., stack traces, internal error codes, database messages) shall be exposed to the general user. In case of failure, the system should default to a secure, non-informative state.
*   **Adam-Only Debugging**: A correlation ID and potentially more detailed (but still non-sensitive) error information will be available only to users identified as "Adam" (or in a designated debug mode) to aid in troubleshooting.
*   **No Instrumentation**: This specification focuses solely on client-visible aspects and does not include requirements for logging, monitoring, or backend instrumentation.

## 3. Error Envelope Structure

When an API call fails, the client-side UI should present an error envelope with the following components:

### 3.1. User-Facing Message
*   **Content**: A concise, human-readable message indicating what went wrong.
    *   **Generic Fallback**: "Something went wrong. Please try again."
    *   **Specific Context**: Where possible, provide context (e.g., "Failed to load your Most Important Tasks.", "Lumin is unavailable right now.").
*   **Placement**: Errors should typically appear inline within the affected widget or section, replacing the content that failed to load or update. For critical, global failures, a temporary overlay or toast might be considered, but inline is preferred for localized issues.
*   **Visuals**: Use a clear visual indicator (e.g., a warning icon, distinct styling) to denote an error state. The existing `.empty` class styling with a `⚠️` emoji is a suitable starting point.

### 3.2. Retry Mechanism
*   **Action**: A clearly labeled button or link, typically "Retry" or "Try Again".
*   **Behavior**: Clicking the retry action should re-initiate the specific API call that failed.
*   **Placement**: Adjacent to the user-facing message within the error envelope.

### 3.3. Adam-Only Debug Details (Correlation ID)
*   **Visibility**: This section is only visible if the client is operating in a designated "Adam-only" or debug mode (e.g., `localStorage.getItem('lifeos_debug_mode') === 'true'`).
*   **Content**:
    *   **Correlation ID**: Display the `x-request-id` (or similar) header value received from the backend in the error response. This ID is critical for tracing issues in backend logs.
    *   **Optional API Error Message**: A sanitized, non-sensitive error message directly from the API response, if available and deemed useful for debugging without exposing internal details.
*   **Placement**: Below the user-facing message and retry button, clearly demarcated as debug information.

## 4. Display Mechanism Examples

### 4.1. Widget-Specific Error (e.g., MITs, Calendar, Goals, Scores)
If an API call for a specific widget fails (e.g., `/api/v1/lifeos/commitments`), the widget's content area should be replaced with the error envelope.

**Example HTML structure (conceptual):**
```html
<div class="card accent-border-today">
    <div class="card-label">Today's MITs</div>
    <div class="error-envelope empty">
        <span>⚠️</span>
        <p>Failed to load your Most Important Tasks.</p>
        <button class="btn-add btn-retry">Retry</button>
        <!-- Adam-only debug info -->
        <div class="debug-info" style="display: none;">
            <p>Correlation ID: [UUID]</p>
            <p>API Error: [Sanitized API message]</p>
        </div>
    </div>
</div>
```

### 4.2. Chat Error (e.g., `/api/v1/lifeos/chat`)
For chat interactions, errors should be added as an `ambient` message within the chat history. A retry mechanism for chat might be more complex, potentially re-sending the last user message. For initial implementation, the existing `ambient` message pattern is sufficient, with the user manually re-typing or re-initiating.

**Example (existing pattern, extended):**
```javascript
// ... inside sendMessage() catch block or if !r.ok
addMessage('ambient', 'Lumin is unavailable right now. Please try again later.');
// If the last message was a failed user send, consider adding a retry button next to the ambient message.
```

## 5. Implementation Considerations
*   **Centralized Error Handling**: Consider a utility function or class to standardize the creation and display of error envelopes across different widgets to ensure consistency.
*   **API Client Enhancement**: The `API` fetch wrapper should be enhanced to parse error responses, extract correlation IDs, and provide a consistent error object to the UI.
*   **Adam-Only Toggle**: Implement a simple client-side mechanism (e.g., `localStorage.setItem('lifeos_debug_mode', 'true')` in the console) to enable/disable the display of Adam-only debug details.