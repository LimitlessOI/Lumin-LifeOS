<!-- SYNOPSIS: Documentation — TC INTAKE WORKSPACE AUDIT. -->

### KNOW
*   **Wired Components:**
    *   The `/api/v1/tc/intake/workspace` endpoint is implemented and authenticated via `*rk` (COMMAND_CENTER_KEY).
    *   It aggregates data from `tc_transactions`, `tc_approval_items`, `tc_alerts`, `tc_transaction_events`, and `email_triage_log`.
    *   `tc-status-engine.js` is used to derive transaction state, health, next actions, and missing documents.
    *   `tc-access-service.js` provides system readiness status (IMAP, GLVAR, SkySlope).
    *   Email-to-transaction matching and scoring (`scoreEmailToTransaction`) are implemented using tokenization of email subject/body/sender and transaction address/parties.
    *   The workspace presents a summary, a list of active transactions, an intake queue of actionable emails with suggested transaction matches, recent intake activity, and a list of suggested next actions.
*   **Dependencies on Secrets/Remote Runtime:**
    *   **IMAP Credentials:** `TC_IMAP_APP_Adam_PASSWORD` or `WORK_EMAIL_APP_PASSWORD` (resolved via `services/tc-imap-config.js`) are required for `email_triage_log` population and `imap_ready` status.
    *   **GLVAR Credentials:** Username and password for GLVAR are needed for `glvar_ready` status, managed by `account-manager.js` and used by `tc-browser-agent.js`.
    *   **eXp Okta Credentials:** Username and password for eXp Okta are needed for `skyslope_ready` status, managed by `account-manager.js` and used by `tc-browser-agent.js`.
    *   **Database:** All data persistence and retrieval rely on the PostgreSQL database (`pool`).
    *   **Browser Automation:** `tc-browser-agent.js` (used by `accessService` for readiness checks) requires Chromium, which must be installed in the Railway `Dockerfile`.
    *   **Email Triage:** The `email_triage_log` is populated by `email-triage.js`, which depends on IMAP access and potentially external AI services for email classification.

### THINK
*   **Email Matching Accuracy:** The current `scoreEmailToTransaction` relies on simple token matching. While functional, it might have limitations in accurately identifying transactions for complex or ambiguous email content, potentially leading to more manual triage.
*   **Operator Workflow Efficiency:** The workspace identifies actionable emails and suggests next steps, but the direct actions (e.g., "create transaction," "link transaction," "mark actioned") are not directly exposed within the workspace UI, requiring the operator to use other endpoints or tools.
*   **Data Freshness Visibility:** The workspace indicates if IMAP access is ready, but it doesn't explicitly show when the `email_triage_log` was last updated. This could lead to operators working with stale data without realizing it.
*   **Prioritization of Next Actions:** The `next_actions` list is currently a simple aggregation. A more sophisticated prioritization mechanism could guide the operator more effectively.

### Missing verifiers
*   **`scoreEmailToTransaction` Accuracy:** A verifier (e.g., unit tests with a diverse dataset of emails and transactions) to measure the precision and recall of the email-to-transaction matching logic.
*   **Email Triage Freshness:** A verifier to ensure the `email_triage_log` is regularly updated, perhaps by checking the timestamp of the latest entry against the last scan time.
*   **`next_actions` Relevance:** A verifier to confirm that the generated `next_actions` accurately reflect the highest-priority tasks based on the current state of the system and transactions.

### Next three fixes
1.  **Integrate "Create Transaction" and "Link Transaction" actions into the intake queue:** For `tc_contract` emails in the `intake_queue`, add UI-ready actions (e.g., `create_transaction_endpoint`, `link_transaction_endpoint`) that map to `/api/v1/tc/email/triage/:id/create-transaction` and `/api/v1/tc/email/triage/:id/link-transaction` respectively, allowing operators to act directly from the workspace.
2.  **Add "Mark Email Actioned" action to intake queue items:** For all actionable emails in the `intake_queue`, expose an action (e.g., `mark_actioned_endpoint`) that calls `/api/v1/tc/email/triage/:id/action` to allow operators to clear emails from their queue.
3.  **Display "Last Email Scan" timestamp in workspace summary:** Fetch and include the timestamp of the last successful email inbox scan (e.g., from a system status table or `email_triage_log`'s latest `received_at`) in the `summary` object of the workspace response.