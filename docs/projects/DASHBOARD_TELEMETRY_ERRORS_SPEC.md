## Client-Visible Error Envelopes Specification

This specification outlines the desired behavior and presentation for API failure messages and error handling visible to the client, particularly within the LifeOS Dashboard. The goal is to provide clear, actionable feedback to the user while maintaining privacy and aiding debugging for Adam.

### 1. API Failure Copy

**User-Facing Messages:**
-   **Generic Failure:** For most API failures, display a concise, user-friendly message such as: "Something went wrong. Please try again." or "We're having trouble loading this information."
-   **Network Issues:** If a network-specific error (e.g., `TypeError: Failed to fetch`) is detected, a message like: "It looks like you're offline or experiencing network issues. Please check your connection."
-   **Authentication/Authorization:** If an API returns a 401/403 status, the client should prompt the user to re-authenticate or indicate insufficient permissions. (e.g., "Your session has expired. Please log in again." or "You don't have permission to perform this action.")
-   **Rate Limiting (429):** "You've sent too many requests. Please wait a moment and try again."
-   **Specific Component Failures:** When a specific dashboard component (e.g., MITs list, Calendar) fails to load, the error message should be localized to that component's section, replacing the content with a message like: "Could not load [Component Name]. Please try again."

**Adam-Only (Developer) Messages:**
-   In a debug mode (e.g., activated by a query parameter `?debug=true` or a local storage flag), more detailed error information, including the raw API error response (if safe), should be logged to the browser's developer console (`console.error`).
-   This detailed information should *never* be displayed directly in the main UI unless explicitly enabled by Adam for debugging purposes.

### 2. Retry Mechanism

-   **Manual Retry:** For transient errors or component-specific failures, a "Retry" button should be presented alongside the error message. Clicking this button should re-attempt the failed API call.
-   **Page Refresh:** For broader application-level failures or persistent issues, the user should be advised to refresh the page.
-   **No Automatic Retries:** The client should not implement automatic API request retries (e.g., exponential backoff) for user-visible errors, to avoid masking persistent issues or creating infinite loops.

### 3. Correlation ID Surfacing

-   **Backend Requirement:** All API error responses from the backend *must* include a `x-request-id` header or a `correlationId` field in the JSON error body. This ID is a unique identifier for the specific request on the server.
-   **Adam-Only Visibility:**
    -   The `correlationId` should *always* be logged to `console.error` when an API call fails, regardless of debug mode.
    -   In debug mode, or upon explicit user action (e.g., clicking a "Details" link on an error message), the `correlationId` can be displayed in a small, dismissible toast or modal, allowing Adam to easily copy it for backend investigation.
-   **User Copy:** The `correlationId` should *not* be displayed to the general user in the main UI. If a user needs to report an issue, they should be instructed to provide a screenshot or describe the problem, and Adam can retrieve the ID from logs or debug mode.

### 4. Privacy / Fail-Closed Principles

-   **No Internal Details:** Error messages displayed to the user must *never* contain sensitive internal server details, stack traces, database error messages, or specific file paths.
-   **Generic by Default:** When in doubt, default to the most generic error message.
-   **Data Integrity:** If an API call fails to retrieve data, the corresponding UI component should either display a clear error message or remain empty/in its previous state, rather than showing partial, stale, or incorrect information.
-   **No Data Leakage:** Ensure that error handling logic does not inadvertently expose any user data or system configuration.

### 5. No Instrumentation Code

-   This specification explicitly excludes the addition of client-side error tracking, analytics, or performance instrumentation code. Any such requirements would be covered by a separate specification.