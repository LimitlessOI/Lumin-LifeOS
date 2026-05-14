The task asks for a specification, but the final instruction block implies generating code. I am proceeding with a Markdown specification as requested by the task's explicit wording for a "Spec".

# Client-Visible API Error Envelopes Specification

This document outlines the standard for presenting API failure information to the user in the LifeOS Dashboard, balancing transparency for Adam (the developer/power user) with user-friendliness and privacy.

## 1. General Principles

*   **User-Centric Messaging**: Error messages displayed directly to the end-user must be clear, concise, and actionable. They should avoid technical jargon and focus on what the user can do or what the system is doing to resolve the issue.
*   **Fail-Closed & Graceful Degradation**: API failures should not crash the application. Individual widgets or components should display an error state, but the rest of the dashboard must remain functional. No sensitive data should be exposed in error messages.
*   **Privacy by Default**: No internal system details, stack traces, or sensitive data should ever be exposed to the end-user.
*   **No Instrumentation**: This specification does not include client-side error instrumentation or telemetry.

## 2. Error Types and Handling

### 2.1. Network Errors (Client-Side)

These occur when the client fails to connect to the API (e.g., `fetch` promise rejection due to network down, CORS issues, DNS failure).

*   **User-Visible Copy**:
    *   **Generic**: "Failed to connect to LifeOS. Please check your network connection and try again."
    *   **Contextual (e.g., Chat)**: "Failed to connect to Lumin. Check your network." (as per existing `lifeos-dashboard.html` pattern).
*   **Adam-Only Details**: The full `Error` object (including message, stack trace if available) should be logged to the browser's developer console (`console.error`).
*   **Correlation ID**: Not applicable for client-side network errors as no server request was successfully initiated.
*   **Retry**: Manual retry by refreshing the page or re-attempting the action (e.g., clicking a "Retry" button if implemented, or re-sending a chat message). No automatic client-side retries are specified at this time.

### 2.2. API Errors (Server-Side)

These occur when the API responds with a non-2xx HTTP status code (e.g., 4xx, 5xx) or returns a malformed/unexpected response body.

*   **User-Visible Copy**:
    *   **Generic**: "LifeOS is currently unavailable. Please try again later."
    *   **Contextual (e.g., Chat)**: "Lumin is unavailable right now. Please try again later." (as per existing `lifeos-dashboard.html` pattern).
    *   **Specific (if applicable and safe)**: If the API provides a user-safe error message (e.g., "Invalid input provided for X"), this *may* be displayed, but only after strict sanitization and review. By default, prefer generic messages.
*   **Adam-Only Details**:
    *   The full HTTP response (status code, headers, response body) should be logged to the browser's developer console (`console.error`).
    *   If the server provides a `x-request-id` or `x-correlation-id` header, this value **must** be logged to the console alongside the error details.
*   **Correlation ID**:
    *   **User Copy**: NEVER displayed to the end-user.
    *   **Adam-Only**: Displayed in the browser's developer console (`console.error`) for debugging purposes. This allows Adam to correlate client-side errors with server-side logs.
*   **Retry**: Manual retry by refreshing the page or re-attempting the action. No automatic client-side retries are specified at this time.

## 3. Implementation Guidance

*   **Centralized Error Handling**: Where possible, implement a common utility function or middleware for `fetch` calls to standardize error processing (e.g., checking `response.ok`, parsing JSON, logging).
*   **UI Integration**: Error messages should be displayed within the context of the failing widget/component (e.g., replacing content with an error message, or a small banner). Global toasts/modals should be reserved for critical, app-wide failures.
*   **Existing Patterns**: Adhere to the existing error display patterns found in `public/overlay/lifeos-dashboard.html` (e.g., `<div class="empty"><span>⚠️</span>Failed to load MITs</div>`).