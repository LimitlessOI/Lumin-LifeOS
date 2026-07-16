<!-- SYNOPSIS: Documentation — Memory Ttl Policy. -->

To detail the implementation logic for the Memory TTL and archival policy, follow this structured framework:

1. **Record Fields**: Ensure each memory record includes fields like `createdAt`, `updatedAt`, `expiresAt`, `archivedAt`, `deletedAt`, and `status`. These fields track the record's lifecycle and current status.

2. **TTL Calculation**:
   - Define `expiresAt` as `createdAt + defaultTtlMs`. This ensures each record expires based on its creation time.
   - Optionally, adjust `expiresAt` during updates if TTL refreshes are allowed. Otherwise, keep the original `expiresAt`.

3. **Default TTL**: Implement a default TTL of 7 days globally. Allow memory classes to specify their own TTLs for flexibility, maintaining default behavior when specific TTLs aren't set.

4. **Custom TTLs**:
   - Permit custom TTLs where needed, ensuring they're positive integers.
   - Set a maximum TTL to avoid long retention periods that could cause system inefficiencies.

5. **Active Read Semantics**: Ensure only non-expired records are returned during active reads. Provide optional access to expired records for historical data retrieval, with clear documentation.

6. **Archive Logic**:
   - Automate the archival of expired records, marking them with `archivedAt`. Customize this process to meet organizational needs.
   - Define a retention period for archived records before permanent deletion, aligning with data retention policies and compliance.

7. **Expiration Handling**:
   - Use scheduled cleanup jobs to systematically archive expired records, ensuring consistent operations.
   - Implement request-time checks to catch any missed expired records for additional lifecycle management reliability.

Implementing these steps will effectively manage record lifecycles, ensure compliance with retention policies, and maintain system efficiency. This structured approach provides clear TTL and archival logic, ensuring robust behavior and coverage.