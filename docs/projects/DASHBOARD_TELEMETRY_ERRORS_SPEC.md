# API Client Error Envelope Specification

This document outlines the standard for client-visible error envelopes within the LifeOS platform, focusing on API failure copy, retry mechanisms, correlation ID surfacing, and privacy/fail-closed principles. This specification does not include instrumentation code.

## 1. API Error Response Structure

All API endpoints returning an error should adhere to the following JSON structure:

```json
{
  "error": {
    "code": "STRING",          // A machine-readable error code (e.g., "INVALID_INPUT", "RESOURCE_NOT_FOUND", "SERVICE_UNAVAILABLE").
    "message": "STRING",       // A user-friendly, non-technical message suitable for direct display to the end-user.
    "detail": "STRING",        // (Adam-only) A more technical description of the error, including internal context or specific validation failures.
    "correlationId": "UUID",   // (Adam-only) A unique identifier for the request, useful for tracing and debugging.
    "retryable": BOOLEAN       // Indicates if the operation is potentially retryable by the client (e.g., network issues, temporary service unavailability).
  }
}
```

**Principles:**
*   `message` should be concise and actionable for the user.
*   `detail` and `correlationId` must *never* be displayed to the general user.
*   If `message` is omitted or empty, the client should fall back to a generic error message.

## 2. Client-Side Error Handling & Display

The client (e.g., `lifeos-dashboard.html`) must implement a consistent approach to handling API errors.

### 2.1 User-Facing Error Copy

*   **Primary Display**: The `error.message` from the API response should be displayed to the user.
*   **Generic Fallback**: If `error.message` is not provided or is empty, the client should display a generic message such as:
    *   "Something went wrong. Please try again." (for retryable errors)
    *   "We're experiencing a temporary issue. Your data is safe, please try again later." (for non-retryable, transient errors)
    *   "An unexpected error occurred. Please contact support if the problem persists." (for unhandled or critical errors)
*   **Privacy**: Raw backend error messages, stack traces, or internal system details must *never* be shown to the user.

### 2.2 Adam-Only Debug Information

For users identified as "Adam" (e.g., via a `window.lifeosUser.isAdmin` flag or similar debug mode), additional error details should be made available:
*   **Correlation ID**: The `error.correlationId` should be displayed in a developer console or a discreet, Adam-only debug overlay.
*   **Technical Detail**: The `error.detail` and `error.code` should also be displayed in the Adam-only debug interface.
*   **User-facing reference**: For all users, the generic error message *may* include a reference to the correlation ID for support purposes, e.g., "If the problem persists, please contact support and mention reference ID: [correlationId]". This should be carefully considered to avoid overwhelming the user.

### 2.3 Retry Mechanism

*   **API-driven Retryability**: The `error.retryable` flag in the API response dictates if a retry action should be presented to the user.
*   **User-Initiated Retry**: For `retryable: true` errors, a "Retry" button or link should be displayed alongside the error message.
*   **Automatic Retries (Client-side)**: For transient network errors (e.g., `TypeError: Failed to fetch`), the client *may* implement a limited number of automatic retries with exponential backoff (e.g., 3 retries with 1s, 2s, 4s delays). This should be transparent to the user, with a loading indicator. If automatic retries fail, the user-facing error message and manual retry option should be presented.

## 3. Privacy and Fail-Closed Principles

*   **Default to Safe**: In any error scenario, the system must default to a "fail-closed" state. This means:
    *   No sensitive user data or system internals are exposed.
    *   Operations that could lead to data corruption or security vulnerabilities are halted.
*   **Data Integrity**: Ensure that error handling does not compromise data integrity. If an operation fails, the system should revert to a known good state or clearly indicate the failure.
*   **Graceful Degradation**: When an API call fails, the affected UI component should display an appropriate error message and potentially a retry option, rather than crashing the entire application or displaying stale/incorrect data without indication.

## 4. No Instrumentation Code

This specification focuses solely on the client-visible aspects of error envelopes. It explicitly excludes details regarding:
*   Client-side logging of errors to analytics or monitoring systems.
*   Error reporting mechanisms (e.g., Sentry, Bugsnag).
*   Performance monitoring related to errors.

These aspects are handled by separate instrumentation and monitoring specifications.