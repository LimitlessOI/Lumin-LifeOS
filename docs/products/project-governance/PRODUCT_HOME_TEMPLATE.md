<!-- SYNOPSIS: Canonical product home template -->

# Product Home Template

Use this template for new canonical product homes under `docs/products/<product-id>/PRODUCT_HOME.md`.

```md
# [Product Name] Product Home

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` \| `production` \| `deprecated` |
| **Reversibility** | `one-way-door` \| `two-way-door` |
| **Stability** | `safe` \| `needs-review` \| `high-risk` |
| **Last Updated** | YYYY-MM-DD |
| **Verification Command** | `node scripts/verify-project.mjs --project <project_id>` |
| **Manifest** | `docs/products/<product-id>/FILE_MANIFEST.json` |

## Mission

One sentence. Why this product exists.

## North Star Anchor

Which constitutional principle this product serves.

## Scope / Non-Scope

**In scope**
- Explicit owned outcomes.

**Out of scope**
- Explicitly rejected scope creep.

## Owned Files

```text
routes/<feature>-routes.js
services/<feature>.js
public/overlay/<feature>.*
```

## Protected Files

```text
server.js
startup/register-runtime-routes.js
config/council-members.js
```

## Design Spec

### Data Model

### API Surface

### UI Surface

### External Dependencies

## Build Plan

- [ ] One exact next step only.

## Pre-Build Readiness

Copy the canonical checklist from:
`docs/products/project-governance/READINESS_CHECKLIST.md`

## Anti-Drift Assertions

## Decision Log

## Why Not Other Approaches

## Test Criteria

## Handoff

## Runbook

## Decision Debt

## Change Receipts
```

Rule: the canonical product home is the live authority. Old amendment-era files become history, not active product SSOT.
