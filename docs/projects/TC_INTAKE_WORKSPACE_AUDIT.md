### KNOW
The `tc-intake-workspace-service.js` module provides the data for the agent intake workspace, which is the default loading surface for the agent portal as per Amendment 17.

**Wired Components & Data Sources:**
*   **`getWorkspace()` endpoint (`GET /api/v1/tc/intake/workspace`):** This is the primary API endpoint for the intake workspace, authenticated via `*rk` (COMMAND_CENTER_KEY).
*   **Active Transactions:** `listActiveTransactions()` fetches `tc_transactions` with `status IN ('active', 'pending')`, ordered by `close_date` and `created_at`. It includes derived status (`stage`, `health_status`, `next_action`, `missing_doc_count`, `blocker_count`, `risk_flags`, `days_to_close`, `last_client_update_at`, `next_client_update_due_at`, `portal_sync_status`, `contingencies`) from `tc-status-engine.js`. It also aggregates `pending_approvals` from `tc_approval_items` and `open_operator_alerts` from `tc_alerts`.
*   **Actionable Emails:** `listActionableEmails()` retrieves emails from `email_triage_log` where `action_required = true` and `category` is `tc_contract`, `tc_deadline`, or `client`.
*   **Recent Intake Activity:** `listRecentIntakeActivity()` queries `tc_transaction_events` for `created`, `triage_email_linked`, `td_created`, `td_create_failed`, and `party_intro_sent` events.
*   **Access Readiness:** `accessService.getAccessReadiness()` provides the status of critical system access (IMAP, GLVAR, SkySlope).
*   **Email-Transaction Matching:** `scoreEmailToTransaction()` and `buildQueue()` attempt to automatically match actionable emails to active transactions based on address and party names, assigning a score and confidence level.
*   **Next Actions:** The workspace generates a list of `next_actions` based on access readiness and unmatched contract emails.
*   **Related Intake Routes:**
    *   `POST /api/v1/tc/email/triage/:id/create-transaction`: Creates a new transaction from a triaged `tc_contract` email.
    *   `POST /api/v1/tc/email/triage/:id/link-transaction`: Links a triaged email to an existing transaction.
    *   `POST /api/v1/tc/intake/upload`: Handles manual document uploads, including validation and SkySlope integration.
    *   `POST /api/v1/tc/intake/validate`: Validates a document without uploading.
    *   `POST /api/v1/tc/intake/run`: Initiates a full automated intake process (email search, RPA finding, SkySlope upload).

**Dependencies on Secrets or Remote Runtime:**
*   **Database (`pool`):** All data persistence (`tc_transactions`, `tc_approval_items`, `tc_alerts`, `email_triage_log`, `tc_transaction_events`) relies on a PostgreSQL database (remote runtime).
*   **IMAP:** `email-triage.js` (which populates `email_triage_log`) and `tc-email-document-service.js` depend on IMAP credentials (`TC_IMAP_APP_Adam_PASSWORD`, `WORK_EMAIL_APP_PASSWORD`) stored as secrets and the remote IMAP server.
*   **GLVAR / TransactionDesk:** `accessService` checks GLVAR readiness, which requires `GLVAR_USERNAME` and `GLVAR_PASSWORD` secrets and interaction with the remote GLVAR website via browser automation.
*   **eXp Okta / SkySlope:** `accessService` checks SkySlope readiness, which requires `EXP_OKTA_USERNAME` and `EXP_OKTA_PASSWORD` secrets and interaction with remote eXp Okta/SkySlope via browser automation.
*   **Browser Automation (Puppeteer):** Services like `tc-browser-agent.js` (used by `tc-doc-intake.js`, `tc-listing-skyslope-sync.js`, etc.) require Chromium to be installed on the Railway runtime.
*   **Coordinator Service:** Orchestrates various operations, some of which may involve external AI/NLP services (e.g., `processNewContract`).

### THINK
The intake workspace provides a comprehensive overview for an agent, consolidating critical information and highlighting immediate actions. The email-to-transaction matching logic is a key automation feature, reducing manual effort. The `next_actions` list is a good starting point for guiding the operator.

### Missing verifiers
1.  **IMAP Credential Resolution:** A verifier to confirm that `services/tc-imap-config.js` correctly resolves IMAP credentials from environment variables, including aliases, and that no new IMAP resolution logic is introduced elsewhere.
2.  **Browser Automation Dockerfile:** A verifier to confirm that the Railway deployment is using the Dockerfile that installs Chromium, as browser automation will fail otherwise.
3.  **Email-Transaction Scoring Accuracy:** A verifier (e.g., a suite of integration tests) to ensure `scoreEmailToTransaction` consistently provides high-confidence matches for known transaction emails and low scores for irrelevant ones, especially for `tc_contract` emails.

### Next three fixes
1.  **Refine Email Search Parameters:** Standardize and robustly handle `null`/`undefined`/empty string values for `subject_contains`, `filename_contains`, and `from_contains` in `buildInspectionMailboxSearch` and `buildR4RMailboxSearch` to prevent unexpected search behavior or missed matches.
2.  **Enhance `scoreEmailToTransaction`:** Incorporate attachment filenames (if available in `email_triage_log`) into the email scoring logic, as these often contain crucial transaction identifiers like addresses or MLS numbers.
3.  **Actionable `next_actions`:** Modify the `next_actions` array in `getWorkspace` to include structured data (e.g., `type: 'link_email_to_transaction'`, `payload: { emailId: <id> }`) instead of just strings, enabling direct UI integration for these suggested actions.