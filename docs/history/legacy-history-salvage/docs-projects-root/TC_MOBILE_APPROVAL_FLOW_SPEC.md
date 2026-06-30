<!-- SYNOPSIS: Documentation — TC MOBILE APPROVAL FLOW SPEC. -->

Goal
Enable Transaction Coordinators (TCs) to rapidly approve, reject, or snooze pending items via a secure, single-tap mobile link, streamlining workflow and reducing time to action.

Flow
1.  **Link Generation**: From the Agent Portal, the TC generates a mobile link for a specific approval item, specifying the intended action (e.g., "approve"). The link is copied to the clipboard.
2.  **Mobile Access**: The TC opens the generated link on a mobile device.
3.  **Action Execution**:
    *   **Approve**: Tapping the "Approve" button on the mobile page executes the approval.
    *   **Reject**: Tapping the "Reject" button executes the rejection.
    *   **Snooze**: Tapping the "Snooze" button executes the snooze action, typically with a default snooze period (e.g., until next morning).
4.  **Confirmation/Feedback**: The mobile page displays a confirmation of the action taken.
5.  **Portal Update**: The Agent Portal automatically refreshes to reflect the updated status of the approval item.

State machine
*   **Pending**: Initial state for all approval items.
*   **Approved**: Item has been reviewed and signed off.
    *   Transition from: Pending
    *   Triggered by: Mobile one-tap approval link, Agent Portal "Approve" action.
*   **Rejected**: Item has been reviewed and declined.
    *   Transition from: Pending
    *   Triggered by: Mobile one-tap rejection link (if implemented), Agent Portal "Reject" action.
*   **Snoozed**: Item is temporarily hidden or deferred for later review.
    *   Transition from: Pending
    *   Triggered by: Mobile one-tap snooze link (if implemented), Agent Portal "Snooze" action.
    *   Auto-transition to: Pending (after snooze period expires).

Safety gates
*   **Link Expiration/Single Use**: Mobile links must be time-limited and/or single-use to prevent replay attacks or unauthorized actions.
*   **Authentication**: The mobile link must contain a cryptographically secure, non-guessable token that authenticates the action without requiring a full login on the mobile device. This token must be tied to the generating user and the specific approval item.
*   **Authorization**: The backend must verify that the user associated with the token is authorized to perform the requested action on the specific approval item.
*   **Fail-Closed on Invalid Link**: Any attempt to use an expired, invalid, or tampered link must result in a failed action and an error message, not a default or unintended action.
*   **Audit Trail**: All actions performed via mobile links must be logged in `tc_transaction_events` with details including the actor, action, and method (e.g., "mobile_one_tap").
*   **Data Integrity**: The approval action must only modify the state of the specific approval item and associated transaction status, without unintended side effects.

Deferred work
*   **Mobile UI/UX**: Development of the actual mobile-friendly web page that renders when the link is opened, including clear action buttons and confirmation messages.
*   **Rejection/Snooze Mobile Links**: The current `createMobileLink` in `tc-portal.js` only explicitly supports `action: 'approve'` for approvals. Extending this to generate links for `reject` and `snooze` actions is needed.
*   **Backend Link Validation Logic**: Implementation on the `/api/v1/tc/mobile-links` endpoint to validate the generated token, enforce expiration, and ensure single-use or time-limited validity.
*   **Error Handling on Mobile**: Robust error display on the mobile page for invalid links, unauthorized actions, or backend failures.
*   **Notification Integration**: Optional: Integration with mobile push notifications or SMS to deliver the one-tap link directly to the TC's device.