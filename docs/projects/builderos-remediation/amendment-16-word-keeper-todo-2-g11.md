Amendment 16 Word Keeper - ToDo 2 (G11): 24h Transcript Auto-Purge Confirmation

This memo outlines the next steps for confirming the implementation of the 24h transcript auto-purge cron job, as required by `docs/projects/AMENDMENT_16_WORD_KEEPER.md`. The blueprint is currently blocked by the unconfirmed status of this cron job.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **Confirmation Criteria:** What constitutes definitive "confirmation" of the cron job's implementation and active operation?
    *   Is log evidence sufficient?
    *   Is a specific monitoring alert required?
    *   Is a manual check of purged data necessary?
*   **Cron Job Identification:** Exact name or identifier of the cron job in the system (e.g., Kubernetes cron job name, systemd timer name, specific script path).
*   **Log Location:** Specific log stream or file path where cron job execution logs can be found.

### 2. Already-Settled Constraints

*   The cron job's purpose is to purge transcripts older than 24 hours.
*   No modification to LifeOS user features or TSOS customer-facing surfaces.
*   BuilderOS-only governed loop execution for this task.
*   The cron job should run at least once every 24 hours.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on *verification* and *documentation* of the existing cron job.

1.  **Identify Cron Job:** Locate the configuration for the 24h transcript auto-purge cron job within the infrastructure (e.g., `k8s/cronjobs/transcript-purge.yaml`, `scripts/cron/purge-transcripts.sh`).
2.  **Verify Configuration:** Confirm the schedule (24h interval) and the command executed.
3.  **Monitor Execution:** Check recent system logs for evidence of the cron job's successful execution.
4.  **Document Findings:** Record the cron job's configuration, execution logs, and any observed behavior.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `docs/projects/builderos-remediation/amendment-16-word-keeper-todo-2-g11.md` (this file, for updates)
*   `docs/projects/AMENDMENT_16_WORD_KEEPER.md` (to update status upon confirmation)
*   *Read-only access* to infrastructure configuration files (e.g., `k8s/cronjobs/`, `scripts/cron/`) to identify the cron job.
*   *Read-only access* to system logs (e.g., `var/log/cron.log`, Kubernetes pod logs) to verify execution.

### 5. Required Verifier/Runtime Checks

*   **Configuration Check:** Verify the existence and content of the cron job definition file.
*   **Log Presence Check:** Confirm log entries indicating the cron job has run within the last 24 hours.
*   **Log Success Check:** Parse logs for indicators of successful completion (e.g., "Purge complete", "0 errors").
*   **Data Age Check (Manual/Sample):** If possible and within scope, verify a small sample of purged data or confirm the absence of old data. (Requires founder decision on feasibility for this slice).

### 6. Stop Conditions

*   The 24h transcript auto-purge cron job is definitively identified and confirmed to be actively running as intended.
*   Evidence of its successful execution is documented.
*   `docs/projects/AMENDMENT_16_WORD_KEEPER.md` is updated to reflect the confirmed status of the auto-purge task.
*   All ambiguities listed in Section 1 are resolved.