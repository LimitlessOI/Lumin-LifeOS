<!-- SYNOPSIS: Sherry midwifery billing workflow — human vs system -->

# 02 — Sherry workflow (what touches insurance money)

**Goal:** List every insurance-billing action a midwife practice must do, mark who does it today, and what LifeOS should absorb.

| Action | Why it matters for money | Who today (THINK) | System target |
|--------|--------------------------|-------------------|---------------|
| Collect insurance card / demographics | Wrong member ID = deny | Front desk / Sherry | Capture + ClientCare fields |
| VOB / eligibility | Know covered / deductible / auth | Sherry on phone | VOB transcript + field apply (partial product) |
| Prior auth if required | No auth = deny | Sherry | Checklist + chase |
| Chart clinical care | No note = can't defend code | Sherry (charting) | Future: mic → chart assist |
| Enter charges (CPT/ICD) | Under-code = underbill | Sherry / billing | ChargeSlip / SuperBill automation |
| Create HCFA / UB | Claim vehicle | Sherry / billing | file-superbill path |
| EDI submit (Ally) | Gets to payer | Sherry / billing | AUTOMATED path proved Denise |
| Watch Sent Bills / status | Know if submitted | Sherry | Probe + forever-chase |
| Post ERA | Know paid vs due | Sherry / billing | ERA map OPENED; post BUTTONS TBD |
| Bill patient PR | Collect deductible | Sherry / billing | Statements / auto-debit |
| File secondary | Second payer dollars | Often missed | VERIFY + automate |
| Appeal / correct / resubmit | Denied / underpaid $ | Sherry | Forever-chase + scripts |
| Follow-up calls to payer | Unknown status | Sherry | Forever-chase ask_insurer |
| Write-off decisions | Only founder/Sherry policy | Founder | Never auto-write-off insurance |

## Hands-off mandate (KNOW — Adam)

Sherry should not have to do billing labor to get paid. System pushes ClientCare buttons + chase. Clinical **charting** remains clinical; system can *assist* documentation later (mic) so codes have evidence.

## Split: clinical charting vs billing

| Clinical charting | Billing |
|-------------------|---------|
| What happened (SOAP, flow, birth note) | What is coded and claimed |
| Supports medical necessity | Converts care → dollars |
| Sherry owns clinical truth | System owns submit/chase once chart supports it |

**Future help (parked):** birth/appointment audio → charting + billing-note capture so nothing billable is forgotten.
