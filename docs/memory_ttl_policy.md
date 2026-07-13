<!-- SYNOPSIS: Memory TTL Policy -->

# Memory TTL Policy

This document defines the implementation-level retention policy for memory records used by the application. ## Core Model

Each memory record MUST include:

- `id`: unique identifier
- `createdAt`: ISO-8601 timestamp
- `updatedAt`: ISO-8601 timestamp
- `lastAccessedAt`: ISO-8601 timestamp, updated on read when applicable
- `ttlMs`: time-to-live in milliseconds
- `expiresAt`: computed expiration timestamp
- `status`: one of `active`, `stale`, `archived`, `expired`, `deleted`
- `archiveAt`: optional timestamp when the record is moved to archive storage
- `deletedAt`: optional timestamp when the record is removed from active and archive storage

## TTL Semantics

### Default TTL

Unless a shorter or longer TTL is explicitly assigned, memory records default to:

- `ttlMs = 30 days`

The system should treat this as the baseline retention window for ordinary memories. ### Per-Record TTL

Implementations may assign per-record TTL values based on memory type or confidence, for example:

- short-lived operational memory: hours to days
- user preference memory: weeks to months
- stable profile memory: months
- temporary task context: minutes to days

A record-specific TTL always overrides the default TTL. ### Expiration Calculation

`expiresAt` MUST be computed as:

- `expiresAt = createdAt + ttlMs`

If a record is refreshed or rewritten, implementations MAY either:

- preserve the original `createdAt` and keep the original expiration, or
- update `createdAt` and recalculate `expiresAt`

The chosen behavior MUST be consistent within a given memory type. For user-facing preferences and durable facts, prefer preserving the original creation time unless the content materially changes. ## Access Refresh Policy

A read operation MUST NOT automatically extend TTL unless the memory type explicitly opts into sliding expiration. ### Fixed TTL

For fixed-TTL memories:

- reads update `lastAccessedAt`
- reads do not change `expiresAt`

### Sliding TTL

For sliding-TTL memories:

- reads update `lastAccessedAt`
- reads MAY extend `expiresAt` by resetting it to `now + ttlMs`

Sliding TTL should only be used when the memory is meant to stay alive while actively used. ### Archived

A record is `archived` when it is no longer part of the primary active set but is retained for low-cost historical access. ### Expired

A record is `expired` when:

- `now >= expiresAt`

Expired records are no longer treated as active memories. Expired records MAY remain in archive storage if archive retention applies. ### Deleted

A record is `deleted` when:

- it has been removed from both active and archive storage, or
- a hard-delete request has been processed

Deleted records