<!-- SYNOPSIS: Payer operations lifecycle VOB → claim → ERA → appeal -->

# 05 — Payer operations (lifecycle)

## Lifecycle

```text
Card / demographics
  → VOB / eligibility / auth
  → Document care (charting)
  → Charges (CPT/ICD)
  → Claim (HCFA/UB)
  → EDI clearinghouse (Office Ally)
  → Payer adjudication
  → ERA / EOB
  → Post remit
  → Patient PR / secondary
  → Deny or underpay?
       → Correct / appeal / follow-up (forever-chase)
```

## Map to ClientCare + LifeOS

| Stage | ClientCare | LifeOS today |
|-------|------------|--------------|
| Card / fields | Chart insurance | OCR/pipeline partial; approval-gated |
| VOB | Chart + notes | Transcript → Norton note; listen-in not built |
| Charges | ChargeSlip / SuperBill | Partial automation |
| Claim | HCFA/UB | Denise HCFA+EDI AUTOMATED path |
| Clearinghouse | SendHCFAEDIEdit Ally | AUTOMATED |
| Status | Sent Bills / Claim Status | Probe + forever-chase ledger |
| ERA | Record Remittance | OPENED — post path BUTTONS TBD |
| Follow-up | Billing Follow Up / Aging | OPENED cards |
| Appeal | Notes + resubmit | Scripts / assistant partial |

## Denial classes (study checklist)

| Class | Examples | First response |
|-------|----------|----------------|
| Admin | Wrong ID, timely filing, dup | Correct + resubmit |
| Auth | No prior auth | Retro auth if possible; else appeal |
| Coding | Bundling, invalid DX | Correct codes |
| Medical necessity | Not covered setting / home birth exclusion | Records + appeal; contract check |
| COB | Wrong primary | Fix order; refile |
| Eligibility | Termed coverage | Patient pay / other coverage |

Each CARC/RARC we see in WRM ERAs should be logged here over time (`KNOW` with example).

## Clearinghouse

**KNOW:** Office Ally setting `Office Ally - wrmomma` on SendHCFAEDIEdit for this practice.
