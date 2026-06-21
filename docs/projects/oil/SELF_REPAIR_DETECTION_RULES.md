<!-- SYNOPSIS: OIL Self-Repair Detection Rules & Audit Checklist -->

# OIL Self-Repair Detection Rules & Audit Checklist

**Purpose:** Reusable rules from Command Center / OIL / Builder repair history.  
**Run:** `node scripts/oil-self-repair-audit.mjs`  
**API:** `GET /api/v1/lifeos/command-center/self-repair/audit`

---

## Repair history reviewed (last 3)

| Repair | Commit area | Weakness class |
|--------|-------------|----------------|
| Phase14 proof-store | `8e7124c7` ledger + proof-store | Local proof mistaken for runtime; DB name mismatch |
| CC V2 fake green | `9d689a29` cockpit HTML | OIL missed UI fake green; stale endpoint first |
| SEC-F01 stale deploy | `62591bdb` GAP-FILL | Railway served stale routes; local ≠ deployed |

---

## Detection rules

### DR-001 — LOCAL_VS_GITHUB_MAIN (P2)
- **Trigger:** `local HEAD` ≠ `origin/main` SHA
- **Meaning:** Workbench not aligned with committed source
- **Check:** `git rev-parse HEAD` vs `git rev-parse refs/remotes/origin/main`

### DR-002 — RAILWAY_STALE_DEPLOY (P1)
- **Trigger:** `github_main_sha` ≠ `railway_deploy_sha`
- **Meaning:** Runtime serving older code than main
- **Check:** `GET /api/v1/lifeos/builder/ready` → `codegen.deploy_commit_sha`

### DR-003 — RECEIPT_STALE_RUNTIME_SHA (P2)
- **Trigger:** `receipt.runtime.commit_sha` ≠ `railway_deploy_sha`
- **Meaning:** Latest runtime proof receipt references old deploy
- **Check:** `GET /api/v1/gemini/proof/status` → `last_proof.payload.runtime.commit_sha`

### DR-004 — RAILWAY_DEPLOY_SHA_MISSING (P0)
- **Trigger:** GitHub main known but Railway deploy SHA absent
- **Meaning:** Cannot verify runtime proof chain
- **Blocks build:** Only when `--strict` on audit script

### DR-005 — PROOF_STORE_LOCAL_ONLY (P1)
- **Trigger:** `local proof_store_id` ≠ `railway proof_store_id`
- **Meaning:** Local cert/receipt writes invisible to Railway GET
- **Check:** `GET /api/v1/lifeos/command-center/phase14/proof-store` vs local `DATABASE_URL` fingerprint
- **Never print:** connection string, password, user

### DR-006 — DUAL_CERT_PATH (P1)
- **Trigger:** Local script can write ALPHA_READY without Railway run-proofs
- **Mitigation:** `oil-phase14-railway-canonical.mjs` HALT on DR-005

### DR-007 — UI_FAKE_GREEN (P1)
- **Trigger:** UI shows READY/LIVE without API receipt
- **Checklist:** grep HTML for hardcoded success labels, DEFAULT_* fallbacks, static infra ok

### DR-008 — DEAD_ENDPOINT_FIRST (P2)
- **Trigger:** UI calls 404 endpoint before canonical path
- **Example:** `/api/v1/builder/cert/phase14` before `/command-center/phase14`

### DR-009 — BUILDER_WRONG_IMPORT (P1)
- **Trigger:** Builder commit fails `node --check` or runtime import error
- **Checklist:** `node --check` on every Builder-committed `.js` file before deploy

### DR-010 — OIL_MISSED_ISSUE (receipt)
- **Trigger:** C2 finds issue OIL did not flag
- **Action:** `writeOilMissedIssueReceipt` with `type: oil_missed_issue`

---

## Pre-build checklist (operator)

1. `npm run builder:preflight`
2. `node scripts/oil-self-repair-audit.mjs`
3. If `LOCAL_PROOF_ONLY` → use Railway-canonical paths only
4. If `RAILWAY_STALE_DEPLOY` → `POST /api/v1/railway/deploy` then re-audit
5. If `NOT_VERIFIED` P0 → HALT until deploy SHA available

---

## OIL missed-issue receipt schema (in payload.details)

| Field | Required |
|-------|----------|
| type | `oil_missed_issue` |
| finding_id | yes |
| severity | P0/P1/P2 |
| what_oil_missed | yes |
| how_found | yes |
| required_repair | yes |
| verification_path | yes |

Stored as `security_receipts.receipt_type = audit_verification`.
