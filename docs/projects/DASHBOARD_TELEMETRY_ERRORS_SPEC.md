# Client-Visible Error Envelopes Specification

This document outlines the standard for presenting API failure information to the client, ensuring a consistent user experience, appropriate privacy, and effective debugging for platform administrators.

## 1. API Failure Copy

### 1.1 User-Facing Messages
-   **Generic Error**: For most unhandled or unexpected API failures, display a concise, user-friendly message: "Something went wrong. Please try again."
-   **Specific Actionable Errors**: For known error conditions where the user can take a specific action (e.g., invalid input, missing required fields), provide clear, direct guidance. Examples:
    -   "Please ensure all required fields are filled."
    -   "The API key is invalid. Please check your settings."
    -   "You do not have permission to perform this action."
-   **Network/Connectivity Issues**: "It looks like you're offline or experiencing network issues. Please check your connection."
-   **Rate Limiting**: "You've sent too many requests. Please wait a moment and try again."
-   **No Technical Jargon**: Avoid exposing internal error codes, stack traces, or backend system names directly to the end-user.

### 1.2 Error Display Location
-   Errors should be displayed in a non-intrusive but visible manner, typically near the UI element that triggered the action, or as a temporary toast/banner notification for global issues.
-   Critical errors that block functionality may warrant a modal dialog.

## 2. Retry Mechanism

### 2.1 Client-Initiated Retries
-   For transient errors (e.g., network issues, temporary service unavailability), a "Retry" button should be presented to the user.
-   This button should re-attempt the failed API call.

### 2.2 Automatic Retries (Internal)
-   The client-side `fetch` wrapper (or similar) may implement a limited number of automatic retries (e.g., 1-3 attempts) with exponential backoff for specific HTTP status codes (e.g., 502, 503, 504, or network errors) before surfacing an error to the user.
-   This should be transparent to the user unless all retries fail.

## 3. Correlation ID Surfacing

### 3.1 Adam-Only (Developer/Admin View)
-   A unique `x-request-id` (or similar correlation ID from the backend) must be available for debugging purposes.
-   This ID should be accessible via:
    -   Browser developer console (e.g., logged with the error details).
    -   A hidden debug overlay or "secret" key combination (e.g., `Ctrl+Alt+D`) that reveals extended error information, including the correlation ID.
-   This information is strictly for internal use by Adam (the platform engineer/admin) and should not be visible to general users by default.

### 3.2 User Copy
-   **Never** expose the raw correlation ID directly to the end-user in standard error messages.
-   Instead, if an error persists and requires support, the user message should guide them to contact support without providing the ID. Example: "If the problem persists, please contact support."

## 4. Privacy and Fail-Closed Principle

### 4.1 Default to Generic Errors
-   When in doubt, default to a generic error message ("Something went wrong.") rather than revealing potentially sensitive system details.
-   Error messages should be designed to provide the minimum necessary information for the user to understand the problem or retry, without exposing implementation details.

### 4.2 No Sensitive Data Exposure
-   Ensure that API error responses, when surfaced to the client, do not contain sensitive user data, internal system paths, database query details, or other information that could be exploited.

### 4.3 Fail-Closed
-   In the event of an API failure during an operation that modifies data, the client should assume the operation failed and reflect that state to the user.
-   Avoid optimistic UI updates that might be incorrect if the backend operation failed.
-   For read operations, if data cannot be fetched, display an empty state or a "could not load" message, rather than stale or partial data, unless explicitly designed for offline caching.

## 5. No Instrumentation Code in Spec
-   This specification defines the *behavior* and *content* of error envelopes. It does not include specific client-side instrumentation code (e.g., for logging errors to an analytics service). That is a separate concern for implementation.