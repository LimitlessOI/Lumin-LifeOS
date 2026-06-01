BuilderOS Remediation: Amendment 14 White Label - Partner API Key Schema Definition (G9)

This memo addresses the "Partner apiKey generation not designed — no schema for partner keys vs platform keys" blocking task from the AMENDMENT_14_WHITE_LABEL blueprint. The goal is to establish the foundational data model and initial implementation slice for partner apiKeys.

---

### 1. Blocking Ambiguity or Founder Decision List

*   **API Key Scope:** Can a partner have multiple keys for different internal applications/projects, or one key per partner? (Assume multiple for flexibility, requiring a `description` field).
*   **Key Rotation/Revocation:** What is the policy for key rotation (manual/automatic) and revocation? (Initial slice will support `is_active` flag for revocation; rotation mechanism is out of scope