Amendment 12 Command Center: Phase 14 Cert Endpoint (G1)

This memo outlines the next buildable slice for implementing the Phase 14 certification endpoint, as derived from the `AMENDMENT_12_COMMAND_CENTER.md` blueprint.

1.  **Blocking Ambiguity or Founder Decision List**
    *   **`findingsJson` Source and Structure:** The blueprint states `phase_ledger` comes from `findingsJson`.
        *   Is `findingsJson` a file path, a database field, an in-memory object, or a parameter passed to the cert script?
        *   What is the expected schema/structure of `findingsJson` itself?
        *   What is the specific path within `findingsJson` that contains `phase_ledger`?