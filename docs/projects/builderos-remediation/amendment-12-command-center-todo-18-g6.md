BuilderOS Remediation: Amendment 12 Command Center - TODO 18 G6 (C&C Stability)

This memo addresses the blocking dependency for the Site Builder UI: "waiting on C&C stability." The goal is to define and implement the minimal set of actions required to establish verifiable Command & Control (C&C) stability, thereby unblocking subsequent Site Builder UI development.

### 1. Blocking Ambiguity or Founder Decision List

*   **Definition of "C&C Stability":** What specific metrics and thresholds define "stable" for the Command & Control services relevant to the Site Builder UI?
    *   *Decision Required:* Define critical C&C API endpoints (e.g., authentication, project data, asset management) and their acceptable latency (e.g., <100ms P