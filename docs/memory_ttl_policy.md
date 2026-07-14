<!-- SYNOPSIS: Memory TTL Policy -->

# Memory TTL Policy

This document defines the implementation-level TTL and archive behavior for memory records in this repository. - **Active memory**: a record that is still within TTL and may be returned by standard read paths. - **Expired memory**: a record whose TTL has elapsed and which must not be treated as active. - **Archive**: long-term storage for expired records retained for audit, analysis, or reconstruction. - **Retention window**: the amount of time an expired record is kept in archive before permanent deletion. - **Soft delete**: logical deletion by marking a record inactive/expired without immediately removing the row/document. - **Hard delete**: permanent removal from storage. ## Policy Goals

1. Ensure active memory stays bounded in time. 2. 3. Preserve expired records in archive for a fixed period when needed. 4. Make cleanup and archive promotion deterministic and idempotent. 5. Keep implementation simple enough to run safely in scheduled jobs and request-time checks. ## TTL Model

Each memory record MUST carry the following timestamps/fields:

- `createdAt`: when the record was first written
- `updatedAt`: when the record was last materially modified
- `expiresAt`: when the record stops being active
- `archivedAt`: when the record was moved to archive
- `deletedAt`: when the record was permanently removed, if applicable
- `status`: one of `active`, `expired`, `archived`, `deleted`

### Expiration Calculation

Unless a record defines a custom TTL, expiration is computed as:

`expiresAt = createdAt + defaultTtlMs`

If a record is updated and the update is meant to refresh its lifetime, then:

`expiresAt = updatedAt + defaultTtlMs`

If updates do not extend TTL, `expiresAt` MUST remain unchanged after creation. The implementation MUST be explicit about which update operations refresh TTL and which do not. ## Default TTL

The system MUST define a single default TTL for general memory records. Recommended baseline:

- `defaultTtlMs = 7 * 24 * 60 * 60 * 1000` (7 days)

If the system has multiple memory classes, each class MAY define its own TTL, but every class MUST document:

- the TTL value
- whether updates refresh the TTL
- whether the record is archived or deleted after expiration

## Custom TTL Overrides

A record MAY specify a custom TTL if supported by the data model. Rules:

1. Custom TTL MUST be validated as a positive integer. 2. Custom TTL MUST NOT exceed the maximum allowed TTL for the class, if one exists. 3. Custom TTL MUST be stored explicitly so the expiration rule remains reproducible. 4. Default behavior MUST be used when custom TTL is absent or invalid. ## Active Read Semantics

Read paths that return memory for reasoning, search, or generation MUST exclude expired records. Expired records MUST NOT be mixed with active results unless a caller explicitly requests archive/history access. ## Expiration Handling

Expiration may be enforced in two