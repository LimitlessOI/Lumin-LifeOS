<!-- SYNOPSIS: Amendment 41: MarketingOS Proof - G571-100 Blueprint Note -->

# Amendment 41: MarketingOS Proof - G571-100 Blueprint Note

**SSOT Foundation:** This document serves as the Single Source of Truth for the proof-closing blueprint note regarding MarketingOS signal `g571-100`.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the end-to-end capture, transmission, and initial server-side processing of the `g571-100` "Proof-of-Engagement: Content View >10s" signal from the LifeOS client to a dedicated LifeOS API endpoint. This includes:
*   Client-side detection and emission of the `g571-100` signal.
*   A new, secure, and minimal API endpoint within LifeOS to receive and acknowledge the `g571-100` signal.
*   Basic server-side validation and logging of the received signal payload.

### 2. Smallest Safe Build Slice to Close It

1.  **Client-Side Signal Emitter:** A new, isolated JavaScript module responsible for detecting the `g571-100` condition (e.g., user active on a specific content page for >10 seconds) and dispatching an HTTP POST request to a new LifeOS API endpoint. This module will be loaded conditionally or integrated into an existing client-side analytics/event system.
2.  **Server-Side API Endpoint:** A new, dedicated API route (`/api/v1/marketing-signals/g571-100`) to receive the client-side signal. This endpoint will perform minimal payload validation (e.g., presence of `userId`, `sessionId`, `contentId`, `timestamp`) and log the event for initial proofing. No complex business logic or external system integration beyond logging is required in this slice.

### 3. Exact Safe-Scope Files to Touch First

*   **Client-Side (New File):** `web/public/js/marketing/g571-100-emitter.js`
    *   *Purpose:* Contains the logic to detect the `g571-100` event and send it to the backend.
*   **Server-Side Route (New File):** `src/routes/api/v1/marketingSignals.js`
    *   *Purpose:* Defines the new `/api/v1/marketing-signals/g571-100` POST endpoint.
*   **Server-Side Controller (New File):** `src/controllers/marketingSignalController.js`
    *   *Purpose:* Implements the handler for the `g571-100` endpoint, including basic validation and logging.
*   **Server-Side Router Aggregator (Existing File - Extension):** `src/routes/index.js`
    *   *Purpose:* Imports and registers the new `marketingSignals.js` router.

### 4. Verifier/Runtime Checks

1.  **Client-Side Event Firing:**
    *   Open browser developer tools on a relevant LifeOS content page.
    *   Verify that after 10 seconds of active engagement, a custom event (e.g., `marketing:g571-100-fired`) is dispatched in the browser's console.
2.  **