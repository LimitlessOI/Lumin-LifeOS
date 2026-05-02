# Client-Visible API Error Envelopes Specification

## 1. Purpose
This specification defines a consistent approach for handling and displaying API errors on the client-side, ensuring clarity for users, privacy of internal details, and effective debuggability for authorized personnel.

## 2. API Error Response Contract (Client Expectation)
When an API request fails (e.g., network error, non-2xx HTTP status), the client expects a JSON response body structured as follows:

```json
{
  "error": {
    "message": "A concise, user-friendly explanation of what went wrong.",
    "correlationId": "a-unique-request-identifier-uuid-v4",
    "details": "Optional: More technical details for debugging, not for general users."
  }
}
```
- `error.message` (string, required): The primary message displayed to all users. It should be actionable or informative without exposing internal system specifics.
- `error.correlationId` (string, required): A unique identifier for the failed request. This is crucial for tracing issues in backend logs.
- `error.details` (string, optional): Additional technical context (e.g., specific validation failures, internal error codes) that is useful for debugging but should not be shown to general users.

## 3. Client-Side Error Display Logic

### 3.1. Default User Display (Fail-Closed)
-   **Message:** Always display `error.message` from the API response. If the API response is malformed or a network error occurs without a structured response, fall back to a generic message like "An unexpected error occurred. Please try again."
-   **Privacy:** No internal system details (e.g., stack traces, specific database errors, raw HTTP status codes beyond a general "server error") are to be exposed to the general user. The system defaults to a fail-closed state regarding information disclosure.
-   **Retry Prompt:** For transient errors (e.g., network issues, 5xx server errors), append a suggestion to retry, such as "Please try again later." or provide a "Retry" button if the UI context allows. For 4xx client errors, the message should guide the user to correct their input if possible, without a generic retry.

### 3.2. Adam-Only Debug Display
-   **Activation:** Debug information (correlation ID, details) is surfaced only when a client-side debug flag is active. This flag can be controlled via `localStorage.setItem('lifeos_debug_mode', 'true')`.
-   **Content:** When `lifeos_debug_mode` is `true`:
    -   Append the `correlationId` to the displayed error message.
    -   If `error.details` is present, also append these details.
-   **Formatting:** Debug information should be visually distinct from the main user message (e.g., smaller font, muted color, or within a collapsible/expandable section).
-   **Example (Adam-only, debug mode active):**
    "Could not load tasks. Please try again later. (ID: `[correlationId]`, Details: `[error.details]`)".

## 4. UI Integration
-   Errors should primarily be displayed inline within the relevant UI component where the data or action was expected (e.g., replacing a list of items with an error message, or showing an error below a form field). This follows existing patterns in `public/overlay/lifeos-dashboard.html`.
-   The error message should be clearly visible and use appropriate styling (e.g., `text-red-500` or similar for critical errors, `text-muted` for less severe or informational errors).

## 5. No Instrumentation Code
This specification focuses solely on the client-visible aspects of error handling. It explicitly excludes any requirements for client-side logging, monitoring, or backend instrumentation code.