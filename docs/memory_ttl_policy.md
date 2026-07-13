<!-- SYNOPSIS: Memory TTL Policy -->

# Memory TTL Policy

## Purpose

This document defines the implementation-level policy for memory retention, expiration, and archiving. The goal is to keep active memory lean, preserve useful long-term context, and make TTL behavior deterministic for developers. ## Scope

This policy applies to all stored memory records managed by the application, including:

- user-scoped memory
- session-scoped memory
- system-generated memory
- derived or summarized memory artifacts
- archived memory records

## Core Concepts

### Active memory
Active memory is memory that may be read during normal application operation. It is subject to TTL-based expiration. ### Archived memory
Archived memory is no longer considered active, but remains retained for audit, recovery, or historical analysis. ### Expiration
Expiration is the point at which a memory record is no longer eligible to remain active. Once expired, it is either archived or deleted according to retention rules. ### TTL
TTL (time to live) is the maximum duration a memory record may remain active after its creation or last refresh, depending on the memory class. ---

## TTL Rules

### 1. TTL is class-specific
Each memory record must have a memory class and a corresponding TTL policy. Recommended classes:

- `session`
- `user_short`
- `user_long`
- `system`
- `summary`
- `archive`

### 2. TTL starts from a defined anchor
A memory record must define a TTL anchor:

- `createdAt` for immutable memory
- `lastAccessAt` for access-refresh policies
- `updatedAt` for mutable memory
- `pinnedUntil` if a record is temporarily exempt from expiration

The implementation must use one anchor consistently per class. ### 3. TTL must be deterministic
The expiration decision must be based only on stored timestamps and configured policy values. Do not use implicit heuristics in the expiration check. ### 4. ---

## Recommended Default TTLs

These values are implementation defaults and may be adjusted by product configuration. - `session`: 24 hours
- `user_short`: 7 days
- `user_long`: 90 days
- `system`: 180 days
- `summary`: 30 days
- `archive`: no active TTL; retained until retention purge

If a record has no explicit class, it should default to the shortest applicable TTL for safety. ---

## Expiration Logic

A memory record is expired when:

- `now >= ttlAnchor + ttlDuration`

Where:

- `ttlAnchor` is the timestamp selected by the class policy
- `ttlDuration` is the configured retention interval for the class

### Access-refresh behavior

Some memory classes may refresh TTL on access. If enabled:

- update `lastAccessAt` on successful read
- recompute expiration from `lastAccessAt`
- do not refresh TTL on failed reads or background scans

Access-refresh should only be used when the class policy explicitly allows it. ---

## Archive Logic

### Archive eligibility
When a memory record expires, the system must evaluate whether it should be archived instead of deleted. A record is archive-eligible if:

- it is not marked `ephemeral`
- it is not already archived
- it is not explicitly excluded by policy
- it has not exceeded maximum retention for archival storage

### Archive action
Archiving must:

1. copy or move the record to archive storage
2. preserve original identifiers where needed for traceability
3. mark the active record as archived or tombstoned
4. record the archive timestamp

### Archive payload
Archived records should include:

- original record id
- memory class