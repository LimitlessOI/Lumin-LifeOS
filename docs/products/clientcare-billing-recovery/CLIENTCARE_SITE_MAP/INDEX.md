<!-- SYNOPSIS: Master catalog — every ClientCare surface we know -->

# ClientCare Site Map — INDEX

**Program:** Know the whole site. Template: `_TEMPLATE.md`. Doctrine: `README.md`. Claims finish: `CLAIMS_FINISH.md`.

**Coverage counts (2026-07-15):** billing cards started; rest of site queued as UNOPENED.

## Billing (start here — claims)

| Surface | Card | Coverage |
|---------|------|----------|
| Review Sent Bills | [review-sent-bills.md](surfaces/billing/review-sent-bills.md) | AUTOMATED |
| Send HCFA EDI | [send-hcfa-edi.md](surfaces/billing/send-hcfa-edi.md) | AUTOMATED |
| Invoice HCFA Edit | [invoice-hcfa-edit.md](surfaces/billing/invoice-hcfa-edit.md) | AUTOMATED / PARTIAL ClaimSentDate |
| Charge Slip | [charge-slip.md](surfaces/billing/charge-slip.md) | OPENED |
| Super Bill Report | [super-bill-report.md](surfaces/billing/super-bill-report.md) | OPENED |
| Record Insurance Payment / ERA | [record-remittance-era.md](surfaces/billing/record-remittance-era.md) | OPENED |
| Claim Status | [claim-status.md](surfaces/billing/claim-status.md) | OPENED |
| Accounts Receivable | [accounts-receivable.md](surfaces/billing/accounts-receivable.md) | OPENED |
| Billing Audit | [billing-audit.md](surfaces/billing/billing-audit.md) | OPENED |
| Claim Aging Summary | [claim-aging-summary.md](surfaces/billing/claim-aging-summary.md) | OPENED |
| Billing Progress Checklist | [billing-progress-checklist.md](surfaces/billing/billing-progress-checklist.md) | OPENED |
| Billing Follow Up | [billing-follow-up.md](surfaces/billing/billing-follow-up.md) | OPENED |
| Auto Debit Plans | [auto-debit-plans.md](surfaces/billing/auto-debit-plans.md) | OPENED |
| Allowed Amount | — | UNOPENED (inspect failed once) |
| CPT Codes by Provider | — | UNOPENED (inspect failed once) |
| UB-04 Edit | — | UNOPENED |
| Client Invoice Edit | — | UNOPENED |
| Daily Payments | — | UNOPENED |
| Merchant Account Transactions | — | UNOPENED |
| Missing Transaction Report | — | UNOPENED |
| New Client Checklist | — | UNOPENED |
| Billing Notes home queue | — | UNOPENED card (partial ops elsewhere) |
| Chart → Billing tab | — | UNOPENED card |

## Home queues

| Surface | Coverage |
|---------|----------|
| Home alerts (labs / US / billing notes) | UNOPENED card |
| Birth Activity | UNOPENED card |
| Notes partial | UNOPENED card |
| Labs & U/S | UNOPENED card |
| Front Desk Notes | UNOPENED card |

## Clients / chart (incl. charting)

| Surface | Coverage |
|---------|----------|
| Client list `/Pregnancy` | UNOPENED card |
| Create New Client | UNOPENED card |
| Client chart shell (Denise walked) | URL_KNOWN → card pending |
| Charting / exams / prenatal / newborn | UNOPENED — **Future help** target (birth mic, appointment capture) |
| Call log / consult / referrals / labs orders | UNOPENED |

## Schedule

| Surface | Coverage |
|---------|----------|
| Scheduler | UNOPENED card (page opened once) |

## Reports (non-claims)

| Surface | Coverage |
|---------|----------|
| Reports hub | OPENED preview in billing crawl |
| Active Client, Advanced Client List, Birth totals, etc. | UNOPENED cards |

## Practice management / admin

| Surface | Coverage |
|---------|----------|
| Practice Management | UNOPENED card |
| Employee log / payroll | UNOPENED card |
| Manage Account | UNOPENED card |
| Fax report | UNOPENED card |

## Next actions (ordered)

1. **BUTTONS_PRESSED** pass on every OPENED billing card (Filter/Search/Add Record/row open) — do not stop at OPENED.  
2. Card UB-04 + client invoice + remaining Claims Billing hub items.  
3. Tip-redeploy richer `collectPageSummary` (buttons/inputs/selects) then re-inspect all billing URLs.  
4. Only after claims finish: charting + schedule cards; then **Future help** with Sherry (mic → charting / billing notes).

## Future help parking lot (not build yet)

| Idea | Notes |
|------|-------|
| Birth microphone → charting / billing notes | Adam; Sherry calls it charting |
| Appointment listen-in → capture what matters | Adam |
| Anything else Sherry wants | blank until she says |
