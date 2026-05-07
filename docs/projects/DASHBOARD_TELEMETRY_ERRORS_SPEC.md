# Client-Visible Error Envelopes Specification

## 1. Purpose

This document specifies the structure and content of client-visible error envelopes returned by the LifeOS platform APIs. The goal is to provide clear, actionable, and secure error information to clients, differentiating between internal debugging details and user-friendly messages.

## 2. Error Envelope Structure

All API errors will return a JSON object with the following top-level keys:

```json
{
  "status": "error",
  "code": "string",
  "message": "string",
  "details": "object | null",
  "correlationId": "string | null",
  "retryable": "boolean"
}
```

-   **`status`**: Always `"error"` for failure responses.
-   **`code`**: A machine-readable, internal error code (e.g., `AUTH_FAILED`, `INVALID_INPUT`, `SERVICE_UNAVAILABLE`). This should be consistent across the platform.
-   **`message`**: A human-readable message intended for the end-user. This message should be concise, clear, and avoid technical jargon.
-   **`details`**: An optional object containing additional context relevant to the error. This should generally be omitted or sanitized for public consumption. For Adam-only visibility, this can contain more technical specifics.
-   **`correlationId`**: A unique identifier for the request, allowing for tracing and debugging. This will be surfaced conditionally.
-   **`retryable`**: A boolean indicating whether the client can safely retry the request.

## 3. API Failure Copy

### 3.1 User-Facing Copy (`message`)

-   **Clarity**: Messages must be easy to understand for a non-technical user.
-   **Actionability**: Where possible, messages should suggest a next step (e.g., "Please check your credentials and try again.").
-   **Generality**: Avoid exposing internal system details, database errors, or specific file paths.
-   **Consistency**: Use consistent phrasing and tone across all error messages.
-   **Examples**:
    -   "Authentication failed. Please ensure your API key is correct."
    -   "The requested resource could not be found."
    -   "An unexpected error occurred. Please try again later."
    -   "Your input is invalid. Please review the provided data."

### 3.2 Adam-Only Details (`details`)

-   The `details` field is intended for internal debugging and will only be surfaced to authenticated Adam accounts or internal monitoring systems.
-   It may contain more technical information such as:
    -   Specific validation errors (e.g., "Field 'email' must be a valid email address").
    -   Internal error codes or stack traces (sanitized for sensitive data).
    -   Relevant request parameters that led to the error.
-   This field will be omitted or set to `null` for standard user responses.

## 4. Retry Mechanisms

-   The `retryable` boolean flag will explicitly indicate whether a client can safely retry a failed request.
-   **`retryable: true`**: Indicates transient errors (e.g., network issues, temporary service unavailability, rate limiting). Clients should implement exponential backoff.
-   **`retryable: false`**: Indicates permanent errors (e.g., invalid input, authentication failure, resource not found). Retrying without changing the request parameters is unlikely to succeed.
-   **HTTP Status Codes**: The `retryable` flag should align with standard HTTP status codes (e.g., 429 Too Many Requests, 503 Service Unavailable often imply `retryable: true`; 400 Bad Request, 401 Unauthorized, 404 Not Found imply `retryable: false`).

## 5. Correlation ID

-   A `correlationId` (UUID) will be generated for every incoming request via `mw/request-tracer.js`.
-   **Adam-Only Visibility**: The `correlationId` will be included in the error envelope for all requests originating from or authenticated as an Adam account. This allows Adam to quickly trace issues in logs.
-   **User Copy**: For non-Adam users, the `correlationId` will generally be omitted from the client-visible error envelope to prevent information leakage and reduce cognitive load. In rare cases of critical, unrecoverable errors, a generic reference ID might be provided to users with instructions to contact support, but this should not be the raw `correlationId`.

## 6. Privacy and Fail-Closed Principles

-   **Data Minimization**: Error messages will only contain the minimum information necessary for the user or Adam to understand and address the issue.
-   **No Sensitive Data**: Never expose sensitive user data, internal system configurations, database connection strings, API keys, or other confidential information in error messages, regardless of the `details` field.
-   **Fail-Closed**: In cases where an error occurs during the process of generating an error message itself, or if there's uncertainty about the safety of exposing certain details, the system will default to a generic, non-descriptive error message (e.g., "An unexpected error occurred.") rather than risking information leakage.
-   **No Instrumentation Code**: This specification defines the *output* of error handling, not the implementation of instrumentation. Instrumentation (e.g., logging, metrics) will be handled by separate middleware and services, ensuring a clean separation of concerns.