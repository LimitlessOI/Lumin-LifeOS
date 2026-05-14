# API Error Envelope Specification

### 1. Purpose
This document defines the standard structure for API error responses and the guidelines for handling and displaying these errors on the client-side, specifically within the LifeOS Dashboard. The goal is to provide clear, actionable feedback to users while exposing necessary debugging information to Adam (the developer/power user) and maintaining privacy.

### 2. API Error Response Structure
All API endpoints returning an error (e.g., HTTP status codes 4xx, 5xx) MUST return a JSON body conforming to the following structure:

```json
{
  "error": {
    "code": "string",         // A machine-readable error code (e.g., "VALIDATION_ERROR", "INTERNAL_SERVER_ERROR", "UNAUTHORIZED")
    "message": "string",      // A developer-friendly error message (e.g., "Invalid input for 'text' field")
    "user_message": "string", // (Optional) A user-friendly message, if different from 'message'. Prioritized for display.
    "correlation_id": "string", // A unique identifier for this request, useful for tracing in logs.
    "details": {              // (Optional) An object containing additional technical details.
      // e.g., for validation errors:
      "field_errors": [
        { "field": "text", "reason": "cannot be empty" }
      ]
    }
  }
}
```

**HTTP Status Codes:**
-   `400 Bad Request`: Client-side input validation errors.
-   `401 Unauthorized`: Authentication required or failed.
-   `403 Forbidden`: Authenticated but not authorized to perform the action.
-   `404 Not Found`: Resource not found.
-   `422 Unprocessable Entity`: Semantic errors in request (e.g., business logic validation).
-   `500 Internal Server Error`: Unexpected server-side errors.
-   `503 Service Unavailable`: Temporary server overload or maintenance.

### 3. Client-Side Error Handling Guidelines (LifeOS Dashboard)

#### 3.1. User-Facing Error Copy
-   **Prioritization**:
    1.  If `error.user_message` is present, display that to the user.
    2.  If `error.user_message` is absent, display a generic, user-friendly message based on the HTTP status code or `error.code`.
    3.  **NEVER** display `error.message` directly to the end-user unless it's explicitly designed to be user-friendly.
-   **Generic Fallbacks**:
    *   `400/422`: "There was an issue with your request. Please check your input and try again."
    *   `401/403`: "You don't have permission to do that. Please ensure you are logged in."
    *   `404`: "The requested item could not be found."
    *   `5xx`: "Something went wrong on our end. Please try again in a moment."
    *   Network/Fetch error (no API response): "Failed to connect to LifeOS. Please check your network connection."
-   **Privacy**: Error messages should be fail-closed. Avoid exposing sensitive data, internal system details, or stack traces to the user.

#### 3.2. Adam-Only Correlation ID
-   The `correlation_id` MUST be logged to the browser's console (`console.error`) for every API error.
-   For critical errors displayed in the UI (e.g., a persistent "Failed to load X" message), the correlation ID SHOULD be made accessible to Adam via a subtle UI element (e.g., a small, clickable icon next to the error message, or a tooltip on hover) that reveals the ID. This allows Adam to easily report issues with a traceable ID.
-   The correlation ID should NOT be prominently displayed to regular users.

#### 3.3. Retry Guidance
-   For transient errors (e.g., `503 Service Unavailable`, network errors), the user message SHOULD suggest retrying.
-   For persistent errors (e.g., `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`), the user message SHOULD guide the user on how to correct their input or action, rather than simply suggesting a retry.
-   The client-side code should NOT implement automatic retries without explicit design and user feedback mechanisms.

### 4. Example Client-Side Display Logic

```javascript
async function handleApiError(response) {
  let userMessage = "An unexpected error occurred.";
  let correlationId = "N/A";
  let errorDetails = null;

  try {
    const errorBody = await response.json();
    if (errorBody && errorBody.error) {
      const apiError = errorBody.error;
      correlationId = apiError.correlation_id || correlationId;
      errorDetails = apiError.details;

      if (apiError.user_message) {
        userMessage = apiError.user_message;
      } else {
        // Fallback based on status code or generic message
        switch (response.status) {
          case 400:
          case 422:
            userMessage = "There was an issue with your request. Please check your input and try again.";
            break;
          case 401:
          case 403:
            userMessage = "You don't have permission to do that. Please ensure you are logged in.";
            break;
          case 404:
            userMessage = "The requested item could not be found.";
            break;
          case 503:
            userMessage = "LifeOS is temporarily unavailable. Please try again in a moment.";
            break;
          default:
            userMessage = "Something went wrong on our end. Please try again in a moment.";
        }
      }
      console.error(`API Error [${response.status}] (Correlation ID: ${correlationId}):`, apiError.message, errorDetails);
    } else {
      console.error(`API Error [${response.status}]: Unexpected error format.`, errorBody);
      userMessage = "An unexpected API error occurred.";
    }
  } catch (e) {
    console.error("Failed to parse API error response:", e, response);
    userMessage = "Failed to process the server's response.";
  }

  // Display userMessage in UI, potentially with correlationId for Adam
  // Example: update a specific error div, or show a toast
  displayUserError(userMessage, correlationId);
}

function displayUserError(message, correlationId) {
  const errorDiv = document.getElementById('global-error-display'); // Assuming such a div exists
  if (errorDiv) {
    errorDiv.innerHTML = `
      <span class="error-message">${message}</span>
      <span class="correlation-id-toggle" title="Click to copy Correlation ID"
            onclick="navigator.clipboard.writeText('${correlationId}'); alert('Correlation ID copied!');">
        (ID: ${correlationId.substring(0, 8)}...)
      </span>
    `;
    errorDiv.style.display = 'block';
  } else {
    // Fallback for no dedicated error div
    alert(`${message}\n(Correlation ID: ${correlationId})`);
  }
}

// Example usage in fetch wrapper:
const API_WITH_ERROR_HANDLING = async (p, o={}) => {
  const response = await fetch(p, { headers: HDR(), ...o });
  if (!response.ok) {
    await handleApiError(response);
    throw new Error("API call failed"); // Re-throw to stop further processing
  }
  return response;
};

// Then in existing code:
// try {
//   const r = await API_WITH_ERROR_HANDLING('/api/v1/lifeos/commitments');
//   const d = await r.json();
//   // ... success handling
// } catch (e) {
//   // Error already handled by API_WITH_ERROR_HANDLING, just prevent further UI updates
//   console.log("Caught API call failure, UI update prevented.");
// }
```