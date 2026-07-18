<!-- SYNOPSIS: ClientCare Billing Recovery — Agent Cold-Start Entry -->

# ClientCare Billing Recovery — Agent Cold-Start Entry

**You are working on ClientCare Billing Recovery / BirthBill (billing rescue so the midwife gets paid).**

## Read first

1. `docs/products/clientcare-billing-recovery/PRODUCT_HOME.md` — mission, ownership, readiness state
2. `docs/products/clientcare-billing-recovery/FILE_MANIFEST.json` — every file this product owns
3. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## Founder mandate (2026-07-14) — NON-NEGOTIABLE

**Sherry (the midwife) does nothing to get paid.** The system files claims, prepares claim status, and forever-chases insurers until paid enough or written no-liability denial.

- Midwife action after one-time ClientCare connect: **none**
- Workboard next actions are **system work**, not homework for her
- Auto-file path: `POST /api/v1/clientcare-billing/hands-off/run` + scheduler (`CLIENTCARE_HANDS_OFF`, default on)
- Fail-closed patient bind still applies (never file the wrong chart)

## Critical constraints

- **Never store ClientCare credentials in code, docs, or git.** Use Railway secrets / encrypted tenant vault only.
- The vendor (ClientCare) provides no public API. Puppeteer is the execution path.
- Any payer-specific timely-filing, appeal, or rebill path must be evidence-backed before coded as automatic.
- Tip-prove claim create (Sent Bills nameHit or chart 594xx) before claiming “filed.”

## Owned code boundaries

You may modify:

- `routes/clientcare-billing-routes.js`
- `services/clientcare-billing-service.js`
- `services/clientcare-browser-service.js`
- `services/clientcare-ops-service.js`
- `services/clientcare-sellable-service.js`
- `services/clientcare-sync-service.js`

## Next priority

Tip-prove Denise (or next insurer birth) SuperBillReport **HCFA/Invoice → editor Save → Sent Bills nameHit**, then let hands-off loop clear the forever-chase queue without midwife clicks.
