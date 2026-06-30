<!-- SYNOPSIS: Memory System Cleanup BP -->

# Memory System Cleanup BP

**Status:** Active  
**Purpose:** Remove memory authority confusion without deleting useful history.

## Scope

This cleanup covers four distinct memory surfaces:

1. Legacy CRUD memory
2. Capsule memory
3. Amendment 39 evidence memory
4. Self-repair memory

## Goals

- Define one authority map for all memory systems
- Separate BuilderOS proof memory from product memory
- Stop overlapping route ownership
- Preserve legacy history without letting it influence canonical proof

## Classification Rules

- `CANONICAL`: current governed system for its memory domain
- `PRODUCT_MEMORY`: user/product memory, not BuilderOS maturity proof
- `BUILDEROS_EVIDENCE_MEMORY`: operational/evidence memory that may score BuilderOS alpha
- `SELF_REPAIR_MEMORY`: repair-log and prevention-learning memory
- `LEGACY_KEEP`: still callable or needed for migration/reference
- `LEGACY_ARCHIVE`: preserved history only, not canonical, not used for proof
- `UNKNOWN_DO_NOT_TOUCH`: insufficient evidence to reclassify safely

## Required Route Split

Canonical namespaces:

- `/api/v1/memory/capsules/*`
- `/api/v1/memory/evidence/*`
- `/api/v1/memory/self-repair/*`
- `/api/v1/memory/legacy/*`

## Non-Negotiables

- No deletion before classification
- `epistemic_facts` is the only canonical BuilderOS memory proof source
- `self_repair_memory_events` may support diagnosis but must not inflate alpha maturity
- Legacy CRUD memory must never be treated as canonical BuilderOS proof
