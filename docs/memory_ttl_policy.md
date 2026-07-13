<!-- SYNOPSIS: Memory TTL Policy -->

# Memory TTL Policy

This document defines the implementation-level policy for memory retention, expiration, and archive behavior. Properties:

- indexed for query and lookup
- considered live for application decisions
- subject to TTL expiry
- may be promoted to archive before deletion

### 2. Archived Memory

Archived memory is retained historical data. Properties:

- not used in normal active lookup paths
- may be restored or referenced for auditing
- retained according to archive retention rules
- may be compressed or summarized separately from active records

## TTL Rules

Each memory record must have an expiration policy. Required fields:

- `createdAt`: timestamp when the record was created
- `updatedAt`: timestamp when the record was last modified
- `ttlMs`: time-to-live in milliseconds, or a policy reference that resolves to a TTL
- `expiresAt`: computed absolute expiration timestamp

### TTL Computation

Implementation must compute:

- `expiresAt = createdAt + ttlMs`

If a record is updated and the update is intended to extend its lifetime, the system must explicitly recompute:

- `updatedAt = now`
- `expiresAt = updatedAt + ttlMs`

If the record is not intended to extend on update, `expiresAt` remains unchanged. ### Default TTL

If no TTL is specified, the system must apply a configured default based on memory class. The default must be defined centrally and not duplicated across callers. ## Expiration Behavior

A memory record is considered expired when:

- `now >= expiresAt`

Expired records must not be returned by normal active-memory queries. Expired records must be processed by cleanup or archival routines. ## Expiration Processing

The system must have a periodic cleanup job or equivalent trigger that:

1. scans for expired active records
2. decides whether each record should be archived
3. archives eligible records
4. deletes or deactivates records that are not eligible for archive
5. records the outcome for observability

Cleanup must be idempotent. Running it multiple times must not create duplicate archives or corrupt state. ## Archive Eligibility

Not all expired memory should be archived. Archive eligibility should be determined by policy flags or record metadata. A record is eligible for archive when one or more of the following are true:

- it is marked as important
- it is referenced by other durable entities
- it belongs to a category requiring historical retention
- it has a configured archive policy

If a record is not archive-eligible, it should be deleted or tombstoned after expiry according to storage policy. ## Archiving Rules

When a record is archived:

1. the source active record is marked expired or inactive
2. an archive record is written with preserved identity metadata
3. the archive record includes provenance:
   - source record id
   - archivedAt timestamp
   - original createdAt
   - original expiresAt
   - archive reason
4. the active lookup path must exclude the archived source record
5. archive writes must be deduplicated by source record identity and archive version

Archived records must