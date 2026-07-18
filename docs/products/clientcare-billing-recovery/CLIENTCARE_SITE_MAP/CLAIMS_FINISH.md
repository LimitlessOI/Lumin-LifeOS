<!-- SYNOPSIS: Finish all ClientCare claims work before expanding help ideas -->

# Claims finish checklist

**Goal:** Every claims-related ClientCare surface is carded at least `OPENED`, and the submit→prove money path is `AUTOMATED` with honest Sent Bills proof.

**Doctrine:** Push ClientCare buttons. Do not build a parallel biller.

## Money path (file a claim)

| Step | Surface card | Coverage target | Status |
|------|--------------|-----------------|--------|
| Login | (shared) | AUTOMATED | DONE |
| ChargeSlip / visit bind | `surfaces/billing/charge-slip.md` | BUTTONS_PRESSED | IN PROGRESS |
| Daily Super Bill / SuperBillReport | `surfaces/billing/super-bill-report.md` | OPENED+ | IN PROGRESS |
| HCFA editor | `surfaces/billing/invoice-hcfa-edit.md` | AUTOMATED | MOSTLY DONE |
| Send HCFA EDI + Ally | `surfaces/billing/send-hcfa-edi.md` | AUTOMATED | DONE (local + tip SHA) |
| Review Sent Bills prove | `surfaces/billing/review-sent-bills.md` | AUTOMATED | DONE (filterRecords) |
| Claim Sent Date | (on HCFA card) | BUTTONS_PRESSED | PARTIAL |
| UB-04 path | `surfaces/billing/invoice-ub04-edit.md` | OPENED | NOT STARTED |
| Client invoice path | `surfaces/billing/invoice-client.md` | OPENED | NOT STARTED |

## Post-submit claims (Sherry still does these in ClientCare)

| Surface | Card | Status |
|---------|------|--------|
| Record Insurance Payment / ERA | `record-remittance-era.md` | OPENING |
| Claim Status | `claim-status.md` | OPENING |
| Accounts Receivable | `accounts-receivable.md` | OPENING |
| Billing Audit | `billing-audit.md` | OPENING |
| Claim Aging Summary | `claim-aging-summary.md` | OPENING |
| Billing Progress Checklist | `billing-progress-checklist.md` | OPENING |
| Billing Follow Up | `billing-follow-up.md` | OPENING |
| Allowed Amount | `allowed-amount.md` | OPENING |
| CPT by Provider | `cpt-by-provider.md` | OPENING |
| Auto Debit Plans | `auto-debit-plans.md` | OPENING |
| Daily Payments | TBD | UNOPENED |
| Merchant Account Transactions | TBD | UNOPENED |
| Missing Transaction Report | TBD | UNOPENED |
| New Client Checklist (billing) | TBD | UNOPENED |
| Sent Corrected Claims | TBD | UNOPENED |

## Definition of “claims finished”

- [ ] Every row above has a surface card (not just INDEX link)
- [ ] Money path tip-proved: `filed:true` / Sent Bills nameHit without local-only caveat
- [ ] ERA apply path documented (even if automation gated)
- [ ] Aging + follow-up documented as forever-chase surfaces
- [ ] Duplicate HCFA spam on debug Saves understood and avoided in automation

## Explicitly out of scope until claims finished

Birth mic, appointment listen-in, charting assist, labs triage automation — track under **Future help** on cards only; do not build yet.
