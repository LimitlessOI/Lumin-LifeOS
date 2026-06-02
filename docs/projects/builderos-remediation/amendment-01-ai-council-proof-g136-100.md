BuilderOS Remediation: Amendment 01 AI Council Proof G136-100
This document serves as a proof-closing blueprint note for the `g136-100` proof point, derived from `docs/projects/AMENDMENT_01_AI_COUNCIL.md`. It outlines the next smallest build slice required to close the identified gap, ensuring adherence to AI Council oversight for BuilderOS remediation actions.
---
1. Exact Missing Implementation or Proof Gap:
The current BuilderOS remediation workflow lacks a formal, auditable logging mechanism to record AI Council-approved decisions and their direct application to specific remediation tasks. Specifically, proof point `g136-100` requires explicit logging of the `aiCouncilDecisionId` linked to a `remediationTaskId` upon execution of an AI Council-approved action. This gap prevents full traceability and auditability of AI Council influence on BuilderOS operations.
2. Smallest Safe Build Slice to Close It:
Extend the existing BuilderOS logging utility to include a dedicated function for recording AI Council decision applications. This function will accept `aiCouncilDecisionId`, `remediationTaskId`, and a `decisionTimestamp`, persisting this information to the designated audit log sink. This slice focuses solely on the logging mechanism without altering core remediation logic, only extending its observability.
3. Exact Safe-Scope Files to Touch First:
-   `src/utils/builderOsLogger.js`: Introduce a new export `logAiCouncilDecisionApplication({ aiCouncilDecisionId, remediationTaskId, decisionTimestamp })`. This function will format and push the data to the configured audit log.
-   `src/services/builderOsRemediationService.js`: Within the function responsible for executing AI Council-approved remediation tasks (e.g., `executeApprovedRemediationAction`), add a call to `builderOsLogger.logAiCouncilDecisionApplication` immediately after successful execution, passing the relevant IDs and timestamp.
-   `src/types/builderOs.d.ts` (if applicable): Add a type definition for `AiCouncilDecisionLogEntry` to ensure schema consistency.
4. Verifier/Runtime Checks:
-   Unit Test: Create a unit test for `builderOsLogger.js` to ensure `logAiCouncilDecisionApplication` correctly formats and attempts to log the data. Mock the underlying logging sink to verify payload.
-   Integration Test: Create an integration test that simulates an AI Council-approved remediation action. Verify that a new log entry appears in the audit log sink (e.g., db table, file, cloud log stream) with the correct `aiCouncilDecisionId`, `remediationTaskId`, and a valid `decisionTimestamp`.
-   Schema Validation: Confirm that the logged data adheres to the expected schema for `AiCouncilDecisionLogEntry`.
-   Traceability Check: For a given `remediationTaskId`, verify that its corresponding `aiCouncilDecisionId` can be retrieved from the audit logs.
5. Stop Conditions if Runtime Truth Disagrees:
-   Missing Log Entries: If no log entry is generated for an executed AI Council-approved remediation action.
-   Malformed Log Entries: If log entries are created but are missing `aiCouncilDecisionId`, `remediationTaskId`, or `decisionTimestamp`, or if these fields contain incorrect data types.
-   Performance Degradation: If the logging mechanism introduces measurable latency or resource contention impacting the core remediation service's performance.
-   Data Inconsistency: If the `aiCouncilDecisionId` or `remediationTaskId` in the logs do not accurately reflect the actual action taken or the decision that authorized it.