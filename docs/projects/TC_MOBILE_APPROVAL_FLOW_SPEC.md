Goal
Enable Transaction Coordinators (TCs) to approve, snooze, or reject pending transaction approvals with a single tap on a mobile device, streamlining workflow and reducing latency for critical sign-offs.

Flow
1.  **Agent Initiates Link Generation**: From the Agent Portal (`public/tc/tc-portal.js`), the TC views a pending approval. They tap a "Copy mobile link" button (e.g., `data-approval-link` with `data-action="approve"`).
2.  **System Generates Secure Link**: The `createMobileLink` function calls `/api/v1/tc/mobile-links/approval/:id` with the desired `action` (`approve`, `snooze`, `reject`). The backend generates a unique, time-limited, single-use `execute_url` containing an opaque token.
3.  **Agent Shares Link**: The `execute_url` is copied to the agent's clipboard. The agent then shares this link via their preferred mobile communication channel (e.g., text message, secure chat) to their own mobile device.
4.  **Mobile One-Tap Execution**: The agent (or authorized recipient) taps the `execute_url` on their mobile device.
5.  **Backend Processes Action**: The mobile device's browser opens the `execute_url`. The backend endpoint associated with this URL:
    *   Validates the token (signature, expiry, single-use status).
    *   Identifies the approval and the requested action.
    *   Executes the `PATCH /api/v1/tc/approvals/:id` with the specified `action` and `actor: 'mobile_one_tap'`.
    *   Logs the event in `tc_transaction_events`.
6.  **Confirmation/Error Display**: A simple, minimal web page is displayed on the mobile device, confirming the action's success or reporting a specific error (e.g., "Approval already processed," "Link expired," "Unauthorized").

State machine
*   **States (for a single Approval item)**:
    *   `PENDING`: Initial state, awaiting TC action.
    *   `APPROVED`: Action taken, approval signed off.
    *   `SNOOZED`: Action deferred, approval temporarily hidden/re-alerted later.
    *   `REJECTED`: Action denied, approval explicitly rejected.
    *   `EXPIRED_LINK`: (Internal state for link, not approval) The one-tap link has expired.
    *   `USED_LINK`: (Internal state for link, not approval) The one-tap link has already been used.

*   **Transitions**:
    *   `PENDING` --(Mobile Link: `approve`)--> `APPROVED`
    *   `PENDING` --(Mobile Link: `snooze`)--> `SNOOZED`
    *   `PENDING` --(Mobile Link: `reject`)--> `REJECTED`
    *   `SNOOZED` --(Time-based re-alert)--> `PENDING` (if not yet approved/rejected)
    *   Any state --(Invalid/Expired/Used Link)--> `EXPIRED_LINK` / `USED_LINK` (action fails)

Safety gates
1.  **Link Generation Authorization**: Only authenticated users with `COMMAND_CENTER_KEY` can generate mobile approval links via `/api/v1/tc/mobile-links/approval/:id`.
2.  **Token Integrity**: The `execute_url` must contain a cryptographically secure, opaque token. Any modification to the URL or token must result in immediate rejection of the action.
3.  **Single-Use Enforcement**: Each `execute_url` token must be valid for only one successful execution. Subsequent attempts to use the same token must fail.
4.  **Time-Limited Validity**: Each `execute_url` token must have a short expiration window (e.g., 24-48 hours). Attempts to use an expired token must fail.
5.  **Approval State Precondition**: The approval targeted by the `execute_url` must be in a `PENDING` state at the time of execution. If the approval has already been `APPROVED`, `SNOOZED`, or `REJECTED` through another channel, the mobile action must fail.
6.  **Transaction Validity**: The underlying transaction must be active and valid. If the transaction is closed, cancelled, or otherwise invalid, the approval action must fail.
7.  **Audit Trail**: Every attempt to use an `execute_url` (success or failure) must be logged in `tc_transaction_events` with details including timestamp, approval ID, action, and outcome.
8.  **No Sensitive Data in URL**: The `execute_url` itself should not expose sensitive transaction details or approval content. The token should be the only identifier.

Deferred work
1.  **Backend `execute_url` Endpoint**: Implement the server-side endpoint (e.g., `/api/v1/tc/mobile/execute-approval/:token`) that receives the one-tap request, validates the token, and performs the approval action. This endpoint must be unauthenticated for the mobile tap itself, relying solely on the token's security.
2.  **Token Management Service**: A service responsible for generating, storing (temporarily), and validating these one-time tokens, including tracking their usage and expiration. This would likely involve a new database table (e.g., `tc_mobile_tokens`) to store token details, expiry, and usage status.
3.  **Mobile Confirmation Page**: A simple, static HTML page (or a minimal dynamic page) to display the outcome of the one-tap action (success, already processed, expired, error). This page should be clear and concise.
4.  **Actor Context**: Ensure the `actor` field in `tc_transaction_events` correctly reflects `mobile_one_tap` when the action is performed via this flow.
5.  **Error Handling and User Feedback**: Robust error messages for the mobile confirmation page, distinguishing between "already done," "expired," "invalid," etc.