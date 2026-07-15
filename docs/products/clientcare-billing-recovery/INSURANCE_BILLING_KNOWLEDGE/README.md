<!-- SYNOPSIS: Midwifery insurance billing domain knowledge — every dollar + Sherry ops -->

# Midwifery Insurance Billing Knowledge

## Doctrine

1. **ClientCare is the billing system.** This folder is *what insurance billing means* for a midwifery practice (Sherry / BirthBill) — not a second claims engine.
2. **Every dollar has a type and a chase path.** Unpaid ≠ closed. Underpaid ≠ accepted. Forever-chase applies.
3. **“Increase the bill” means legitimate revenue integrity** — capture all work performed, correct codes/modifiers/POS, bill secondary when due, fight underpayments to allowed/contracted amount. It does **not** mean invent services, upcode fraudulently, or unbundle illegally.
4. **Honesty labels** on every claim of knowledge: `KNOW` (proved in this practice or primary source) / `THINK` (standard midwifery billing pattern) / `VERIFY` (must confirm with Sherry, payer contract, or coder) / `DONT_KNOW`.

## How this relates to SITE_MAP

| Layer | Folder | Question |
|-------|--------|----------|
| **Where to click** | `CLIENTCARE_SITE_MAP/` | Which ClientCare screen / button |
| **What money means** | `INSURANCE_BILLING_KNOWLEDGE/` (this) | Which dollars, codes, payer rules, how to get paid more *legally* |

Both must be complete for “Sherry does nothing to get paid.”

## Folder layout

```text
INSURANCE_BILLING_KNOWLEDGE/
  README.md                 ← this file
  INDEX.md                  ← master outline + coverage
  01_DOLLAR_ANATOMY.md      ← every dollar type on a birth episode
  02_SHERRY_WORKFLOW.md     ← what Sherry touches today vs system
  03_CODE_CATALOG.md        ← CPT / HCPCS / ICD / modifiers / POS
  04_REVENUE_LEVERS.md      ← how to increase legitimate bill + recovery
  05_PAYER_OPS.md           ← VOB, auth, submit, ERA, denial, appeal
  06_UNDERPAYMENT.md        ← allowed amount, short-pay, forever-chase
  07_GAPS_AND_VERIFY.md     ← what we must learn from Sherry / contracts
```

## Coverage rule

A topic is not “known” until INDEX marks it `MAPPED` with source. Wishful coding advice without VERIFY is a honesty violation.
