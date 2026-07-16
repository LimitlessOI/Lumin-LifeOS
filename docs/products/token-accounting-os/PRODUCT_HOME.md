<!-- SYNOPSIS: Canonical product home — Token Accounting OS -->

# Token Accounting OS Product Home

**Formerly called:** Amendment 44 — TOKEN ACCOUNTING OS

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `token-accounting-os` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/token-accounting-os/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
\12026-07-16 — routes/ciGuard.js restored from JSON-patch artifact to valid route module; SSOT sync.

---
**Status:** IN_BUILD — schema + services + routes on disk; production row proof requires deploy + `npm run tokens:verify`
**Authority:** Subordinate to SSOT North Star Constitution

> **Core law:** No AI call is production-valid unless it writes a **token receipt** OR an **explicit unmetered-exception receipt** (`ai_unmetered_exceptions`).

---

## 1. Purpose

Token Accounting OS is the **supreme accounting layer** for all model usage across TokenSaverOS (TSOS). It unifies scattered ledgers into one enforced reporting and health surface.

**Not in scope:** CCL production (Amendment 45), MarketingOS (Amendment 41).

---

## 2. Scope

**In:** Council metering, OCL1 manual path, unified view/API/health, budget env gates, unmetered exceptions, CCL placeholder columns.

**Out:** CCL encode/decode, automatic Cursor metering, MarketingOS.

---

## 3. Relationship to sibling systems

| System | Role |
|--------|------|
| TokenOS / TSOS (Am 10) | B2B product; `tsos_savings_report` subordinate |
| `savings-ledger.js` | Council/Railway writer → `token_usage_log` |
| `token_optimizer_daily` | Rollup in unified view |
| `conductor_session_savings` | Compact-rule savings in unified view |
| OCL1 | Manual Cursor/IDE usage |
| `unified_token_accounting_report` | Supreme reporting surface |
| CCL (Am 45) | Placeholder columns only |
| BuilderOS | task_id/blueprint_id on builds; DONE requires receipt (Phase 2) |

---

## 4. Current state audit (2026-05-24)

| Item | Status |
|------|--------|
| `token_usage_log` schema | VERIFIED |
| `savings-ledger.js` | VERIFIED |
| Council → `recordMetered` | VERIFIED |
| OCL + unified view on disk | VERIFIED |
| Production row counts | UNVERIFIED until Neon query |
| Enhanced AI Usage Tracker | NOT MOUNTED — budget in TAOS |

---

## 5. Mandatory ledger law

1. AI call → `token_usage_log` or `ai_unmetered_exceptions`.
2. No silent ledger failure.
3. Cursor/operator → manual OCL POST.
4. BuilderOS DONE → receipt or exception (Phase 2 wire).

---

## 6. Data model

Tables: `token_usage_log`, `operator_consumption_ledger`, `ai_unmetered_exceptions`, `provider_free_tier_ledger`, `conductor_session_savings`, `token_optimizer_daily`.

View: `unified_token_accounting_report` (migration `20260532`).

CCL placeholders on `token_usage_log`: `ccl_used`, `ccl_packet_id`, `ccl_authority_level`, `ccl_round_trip_status`, `ccl_estimated_savings_tokens`, `ccl_quality_result`, `product_lane`, `blueprint_id`, `oil_result`.

---

## 7. Enforcement

Env: `TOKEN_ACCOUNTING_STRICT`, `TOKEN_ALLOW_UNMETERED`, `TOKEN_DAILY_SOFT_LIMIT_USD`, `TOKEN_DAILY_HARD_LIMIT_USD`, `TOKEN_ALERT_THRESHOLD_USD`.

Council: `recordMetered` → `tokenAccounting.recordMeteredCall` → `savingsLedger.record` or exception.

---

## 8. Operator / Cursor path

`POST /api/v1/tokens/operator/record` or `npm run tokens:operator -- --source cursor --model ... --input N --output N`

---

## 9. Free-tier strategy

ACTUAL from provider API; else ESTIMATED from ledger; else UNKNOWN. Table exists; upsert API Phase 2.

---

## 10. Budget kill-switch

Soft → YELLOW; hard + strict → block. Replaces unmounted enhanced-ai-usage-tracker.

---

## 11. Unified API

`GET /api/v1/tokens/unified`, `/today`, `/history`, `/blind-spots`, `/health`, `/verify`; OCL `/operator/record`, `/recent`, `/summary`.

---

## 12. Build phases

Phase 0–3 done on disk. Phase 4: deploy + row proof. Phase 5: BuilderOS receipt. Phase 7: CCL (Am 45).

---

## 13. Verification

`npm run tokens:verify` | `tokens:health` | `tokens:operator` | `tokens:unified`

---

## 14. Fail-closed

No fake production rows. BLOCKED without DATABASE_URL. Do not claim full coverage without OCL entries.

---

## 15. Next coding task

Wire BuilderOS `/build` completion: attach task_id/blueprint_id, include token health in receipt, block DONE on RED.

---

## Approved Product Backlog

1. BuilderOS token receipt on build complete
2. Free-tier upsert API
3. CI guard against bypassing council metered path

---

## Agent Handoff Notes

Infrastructure on disk. Council uses `recordMetered`. Deploy migrations then `npm run tokens:verify` for production proof.

---

## Change Receipts

| Date | Change | Why |
|------|--------|-----|
|| **Last Updated** | 2026-07-16 — SSOT sync for merged autonomous build artifacts. |
|| **Last Updated** | 2026-07-16 — SSOT sync for merged autonomous build artifacts. |
| 2026-05-24 | Amendment 44 + migrations + services + routes + scripts | Token Accounting OS mission |
|| **Last Updated** | 2026-07-16 — SSOT sync for merged autonomous build artifacts. |

<!-- SSOT sync marker 2026-07-16 -->
