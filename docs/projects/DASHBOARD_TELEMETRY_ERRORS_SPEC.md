The task asks for a specification in Markdown, but the final instruction asks for implementation code. I am providing the specification as requested by the explicit task and specification sections.
---
# Client-Visible Error Envelopes Specification

## 1. Overview
This specification defines the behavior and presentation of API failure messages within the LifeOS Dashboard (`public/overlay/lifeos-dashboard.html`). The primary goals are to provide clear, actionable feedback to the user, ensure privacy, and surface sufficient debugging details to authorized personnel (Adam).

## 2. Core Principles
*   **Fail-Closed**: In case of API failures, the system defaults to a secure and private state. No sensitive internal details are exposed to the end-user.
*   **User-Centric Messaging**: Error messages for general users are concise, empathetic, and suggest clear next steps (e.g., "Please try again later").
*   **Developer-Centric Details**: For Adam (when `lifeos_debug_mode` is enabled in `localStorage`), additional technical details, including correlation IDs, are available for debugging.
*   **No Instrumentation**: This specification explicitly excludes any logging or monitoring instrumentation code.

## 3. Client-Side Error Handling

### 3.1. Generic API Failure Handling
All `fetch` calls wrapped by the `API` helper function will be augmented to catch network errors and non-`ok` HTTP responses. A centralized error display function (`displayAPIError(widgetId, error, response)`) will be used.

#### User-Facing Messages:
*   **Network Error (e.g., `TypeError: Failed to fetch`)**: "Failed to connect to LifeOS. Please check your internet connection and try again."
*   **Server Error (HTTP 5xx)**: "LifeOS is experiencing technical difficulties. Please try again in a few minutes."
*   **Client Error (HTTP 4xx, generic)**: "Something went wrong with your request. Please try again."
*   **Specific Widget Fallback**: If a widget has a more specific, user-friendly error message (e.g., "No MITs — add one below"), that takes precedence for non-critical data loading failures. For critical API failures, the generic messages apply.

#### Adam-Only Details (when `localStorage.getItem('lifeos_debug_mode') === 'true'`):
*   **Correlation ID**: The `x-request-id` header from the API response will be extracted and displayed. If absent, "N/A" will be shown.
*   **Technical Error**: The raw HTTP status (`response.status`), status text (`response.statusText`), and any `error` field from the JSON response body (`d.error`) will be displayed.
*   **Display**: These details will be appended to the user-facing error message within the affected widget, clearly marked as `[DEBUG]`.

### 3.2. Retry Mechanism
*   **User-Initiated**: The primary retry mechanism is user-initiated (e.g., page refresh, re-submission, or explicit "Try Again" button if implemented).
*   **No Automatic Retries**: The dashboard will not implement automatic API call retries with backoff.

### 3.3. Correlation ID Display
*   **User**: Correlation IDs are never displayed to the general user.
*   **Adam**: Displayed as part of the `[DEBUG]` information when `lifeos_debug_mode` is active.

## 4. Example Error Messages (DOM Structure)

### User (Generic Network Error)
```html
<div class="empty"><span>⚠️</span>Failed to connect to LifeOS. Please check your internet connection and try again.</div>
```

### User (Generic Server Error)
```html
<div class="empty"><span>⚠️</span>LifeOS is experiencing technical difficulties. Please try again in a few minutes.</div>
```

### Adam (Debug Mode, Server Error)
```html
<div class="empty">
    <span>⚠️</span>LifeOS is experiencing technical difficulties. Please try again in a few minutes.<br>
    <small style="color:var(--text-muted);">[DEBUG] Status: 500 Internal Server Error. Correlation ID: abc-123-xyz.</small>
</div>
```
The task asks for a specification, but the final instruction asks for implementation code.