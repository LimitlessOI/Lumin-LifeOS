<!-- SYNOPSIS: Memory TTL Policy -->

# Memory TTL Policy

This document defines the implementation-level TTL and archive behavior for memory records in this repository. ## Purpose

Memory records are retained in the active store for a bounded time window, then moved to an archive store for long-term retention and reduced operational cost. ## Record Types

Apply this policy to any persisted memory object that is time-scoped, including:

- user memories
- session memories
- agent observations
- derived summaries
- operational notes that are stored with a timestamp

Each memory record must include:

- `id`
- `createdAt` as an ISO-8601 timestamp
- `updatedAt` as an ISO-8601 timestamp
- `ttlMs` or a policy-resolved TTL value
- `status` with one of:
  - `active`
  - `archived`
  - `deleted`

## TTL Rules

### Default TTL

If a record does not specify its own TTL, use the default active TTL:

- `DEFAULT_MEMORY_TTL_MS = 30 days`

### Override TTL

A record may provide a TTL override when it is created. The override must be a finite positive integer in milliseconds. Validation rules:

- if `ttlMs` is missing, use the default TTL
- if `ttlMs <= 0`, reject the write or coerce to the default depending on the calling layer’s policy
- if `ttlMs` exceeds the configured maximum, clamp it to the maximum allowed TTL

### Maximum TTL

To prevent indefinite active retention, active TTL must be bounded:

- `MAX_MEMORY_TTL_MS = 180 days`

Any active record older than this bound must be archived or deleted by lifecycle processing. ## Expiration Semantics

A record expires when:

- `now >= createdAt + ttlMs`

Expiration does not immediately imply deletion. Expired records transition through an archive step first unless the record is explicitly configured for direct purge. ## Lifecycle States

### Active

A record is active when it is eligible for normal reads, indexing, and ranking. Archived records:

- are excluded from default active queries
- remain readable through archive-specific APIs
- should not be re-ranked with active memories
- may be compacted into cheaper storage

### Deleted

A record is deleted when it is no longer required for retention. Recommended defaults:

- `DEFAULT_ARCHIVE_TTL_MS