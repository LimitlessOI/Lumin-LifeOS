**Client-Visible Error Envelopes Specification**

This document outlines the standard for presenting API errors to the user within the LifeOS Dashboard. The goal is to provide clear, actionable feedback while adhering to privacy and fail-closed principles.

### 1. General Principles

*   **User-Centric Copy**: Error messages must be clear, concise, and understandable by a non-technical user. Avoid jargon.
*   **Privacy (Fail-Closed)**: Never expose internal server errors, stack traces, or sensitive data directly to the user. Generic messages are preferred for end-users.
*   **Actionability**: Where possible, error messages should suggest a next step (e.g., "Please try again," "Check your network connection").
*   **Consistency**: Error presentation should be consistent across all dashboard widgets and features.

### 2. Error Envelope Structure (Client-Side)

When an API call fails, the client-side UI should present an error in a dedicated area (e.g., within a widget, or as an ambient chat message). The error presentation should include:

*   **User Message**: A concise, user-friendly description of the problem.
*   **Retry Option**: A clear mechanism for the user to re-attempt the failed operation.
*   **Correlation ID (Adam-only)**: A unique identifier for the request, visible to the dashboard user for debugging and support purposes. This should be presented in a way that is accessible but not intrusive.

### 3. User-Facing Messages

Standardized messages for common API failure scenarios:

*   **Generic API Error**:
    *   **Message**: "Something went wrong. Please try again."
    *   **Context**: Used for unhandled server errors (e.g., 500-level errors without specific messages), or when a specific error message is not available from the backend.
*   **Network/Connectivity Error**:
    *   **Message**: "Failed to connect. Please check your network connection and try again."
    *   **Context**: Used when `fetch` fails due to network issues (e.g., `TypeError` for network errors).
*   **Service Unavailable/Temporary Issue**:
    *   **Message**: "Lumin is currently unavailable. Please try again in a few moments."
    *   **Context**: Used for specific backend service unavailability (e.g., 503 Service Unavailable, or explicit backend message indicating temporary service issues).
*   **Data Loading Failure**:
    *   **Message**: "Failed to load [Item Type]. Please try again." (e.g., "Failed to load MITs.")
    *   **Context**: Used when a specific data fetch operation fails.

### 4. Correlation ID Handling

*   **Backend Requirement**: All API error responses from the backend *must* include a `x-request-id` header or a `correlationId` field in the JSON body.
*   **Client Display**:
    *   The correlation ID should be displayed alongside the user message, but in a less prominent style (e.g., smaller font, muted color).
    *   It should be clearly labeled, e.g., "Error ID: [correlation_id]".
    *   For chat messages, it can be appended to the ambient error message.
    *   For widget errors, it can be placed below the primary error message.
*   **Adam-only Context**: Since this is a single-user dashboard, "Adam-only" means the correlation ID is always visible to the user for debugging. There is no distinction between "Adam" and "other users" in this context.

### 5. Retry Behavior

*   **Manual Retry Button**: For user-initiated actions (e.g., adding an MIT, sending a chat message), a "Retry" button should be presented alongside the error message.
*   **Automatic Reload (for data widgets)**: For passive data loading widgets (e.g., MITs, Calendar, Goals, Scores), the error message should include a "Reload" button or a link that triggers `loadX()` again.
*   **No Automatic Retries**: The client should not implement automatic retry logic with backoff. This responsibility lies with the backend or a dedicated client-side retry library if explicitly introduced. The user should be in control of retrying.

### 6. No Instrumentation Code

This specification focuses solely on the client-visible aspects of error handling. It does not include details on how errors are logged, monitored, or reported to backend systems. The `console.error` calls in the existing code are acceptable for development debugging but should not be considered the primary error reporting mechanism for production.