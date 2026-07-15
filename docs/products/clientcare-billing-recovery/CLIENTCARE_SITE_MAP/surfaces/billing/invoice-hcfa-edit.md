<!-- SYNOPSIS: ClientCare surface card — Invoice HCFA editor -->

# SURFACE: Invoice HCFA Edit

| Field | Value |
|-------|-------|
| **Surface id** | `cc.billing.invoice_hcfa_edit` |
| **Domain** | billing |
| **URL** | `/Billing/InvoiceHCFAEdit?pregnancyID=` or `/Billing/InvoiceHCFAEdit/{billingId}` |
| **Entry paths** | ChargeSlip / SuperBill / chart Billing / Sent Bills claim link |
| **Coverage** | AUTOMATED (fill/save/EDI open); ClaimSentDate PARTIAL |
| **Last walked** | 2026-07-15 |
| **Walked by** | local-browser + tip |
| **Depends on** | pregnancy or billing id; insurance on chart |
| **Destructive?** | soft Save creates/updates invoices (can mint many HCFAs if looped) |
| **Sherry uses for** | Professional claim form before EDI |

---

## What this page is

HCFA-1500 style claim editor in ClientCare (patient, insured, DX, charges, claim sent method, EDI panel).

## What this page is not

Does not itself host Office Ally dropdown (that is SendHCFAEDIEdit).

---

## Controls inventory (key)

| Label | Element | Action | Pressed? |
|-------|---------|--------|----------|
| Save | button/link | POST InvoiceHCFAEdit | yes |
| Continue Saving Invoice | modal confirm | continues save | yes |
| Claim Sent Method | select → EDI | sets electronic path | yes |
| Send via EDI / `#divEDI` | `showhide` | opens EDI panel | yes |
| Generate EDI | link → SendHCFAEDIEdit | reveals billingID href | yes |
| Claim Sent Date | `input[name=ClaimSentDate]` datepicker | stamp sent date | partial |
| Insured name fields | PrimaryInsurance_* | spouse vs patient | yes (Denise=Alejandro insured) |

## How a human does it

1. Open HCFA for pregnancy/visit.
2. Verify DX/charges/insurance/insured.
3. Save → Continue if prompted.
4. Set method EDI → Generate EDI → Ally page → Generate.
5. Optionally set Claim Sent Date → Save.
6. Prove on Review Sent Bills.

## How we automate it

| Step | Hook | Receipt |
|------|------|---------|
| Direct goto pregnancy | `fileSuperBillClaim` | tip/local |
| Save/Continue | editor attempts | |
| EDI open + Generate EDI | showhide / panel | |
| Hand off to send-hcfa-edi card | | AUTOMATED |

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Many invoice numbers (4398xx) | Repeated Save in debug | Prefer existing billingID; avoid blank new invoice loops |
| ClaimSentDate not persist | datepicker + new BillingID zeros | Use datepicker API; stay on same billing id |

## Future help

| Idea | Who asked | Status |
|------|-----------|--------|
| | | blank |
