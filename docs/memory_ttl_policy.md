<!-- SYNOPSIS: Documentation — Memory Ttl Policy. -->

To address the implementation logic of the Memory TTL and archival policy, consider the following detailed framework:

1. **Record Fields**: Ensure each memory record includes fields like `createdAt`, `updatedAt`, `expiresAt`, `archivedAt`, `deletedAt`, and `status`. These fields help track the record's lifecycle and current status accurately.

2. **TTL Calculation**:
   - Define `expiresAt` as `createdAt + defaultTtlMs`. This ensures each record expires based on its creation time. 
   - If updates are made and TTL refreshes are allowed, adjust `expiresAt` accordingly. Otherwise, retain the original `expiresAt`.

3. **Default TTL**: Implement a global default TTL of 7 days. Allow specific memory classes to define their own TTLs to provide flexibility, while maintaining default behavior when specific TTLs aren't set.

4. **Custom TTLs**:
   - Permit custom TTLs where necessary, ensuring they're positive integers.
   - Set a maximum allowable TTL to prevent overly long retention periods that could lead to inefficiencies.

5. **Active Read Semantics**: Only return non-expired records during active reads. Provide optional access to expired records for historical data retrieval, ensuring this capability is well-documented.

6. **Archive Logic**:
   - Automate the process of archiving expired records by marking them with `archivedAt`. Customize this process as per organizational requirements.
   - Define a retention period for archived records before permanent deletion, aligning with data retention policies and compliance requirements.

7. **Expiration Handling**:
   - Use scheduled cleanup jobs to systematically archive expired records, ensuring consistent operational efficiency.
   - Implement request-time checks to handle any missed expired records for enhanced lifecycle management reliability.

Following these guidelines will help manage record lifecycles effectively, comply with retention policies, and maintain system efficiency. This structured approach outlines clear TTL and archival logic, ensuring robust and predictable system behavior.