<!-- SYNOPSIS: Every dollar type on a midwifery maternity episode -->

# 01 — Dollar anatomy (every dollar)

**Purpose:** Name every money bucket that can exist for a pregnancy/birth/postpartum episode so none are forgotten.

Label each bucket: who owes it, when it appears, ClientCare surface, chase rule.

---

## A. Insurance dollars (primary / secondary / tertiary)

| Bucket | What it is | Typical trigger | ClientCare touch | Chase |
|--------|------------|-----------------|------------------|-------|
| **Billed charges** | What we submit (fee schedule) | HCFA/UB/EDI submit | ChargeSlip, HCFA, Sent Bills | Not cash — ask |
| **Allowed / contracted** | What payer agrees to pay for covered service | Contract / ERA | Allowed Amount report, ERA | Underpay if paid &lt; allowed |
| **Paid by payer** | Remittance to practice | ERA / EOB | Record Insurance Payment | Post + reconcile |
| **Contractual adjustment** | Billed − allowed (write-off to contract) | ERA | Remit posting | Not chase (unless wrong adj) |
| **Deductible (patient)** | Patient share of allowed | ERA PR | Patient AR / statements | Bill patient or secondary |
| **Coinsurance / copay** | Patient share | ERA PR | Patient AR | Same |
| **Secondary insurance due** | Primary paid; secondary owes remainder | After primary ERA | New/secondary claim | File secondary |
| **Denied / zero-pay** | Payer paid $0 with reason code | ERA CARC/RARC | Claim Status, Follow Up | Appeal / correct / resubmit |
| **Underpayment** | Paid &gt; 0 but &lt; allowed (or &lt; expected) | ERA vs Allowed | Aging, AR, Follow Up | Forever-chase |
| **Interest / late pay** | Rare; state prompt-pay | Appeal / complaint | Notes | VERIFY by state |
| **Recoupment** | Payer claws back prior pay | Demand letter / ERA | Adjustments | Fight or repay |

**KNOW (practice):** Forever-chase mandate — unpaid and underpaid insurance births stay open until paid enough, written no-liability denial, or founder closes.

---

## B. Patient / self-pay dollars

| Bucket | What it is | Notes |
|--------|------------|-------|
| Self-pay package | Cash package if no insurance / elects cash | VERIFY Sherry price list |
| Patient responsibility after insurance | Deductible/coinsurance/noncovered | From ERA |
| Auto-debit plans | Payment plans in ClientCare | Surface: Auto Debit Plans report |
| Collections / bad debt | Aged patient AR | VERIFY policy — not a silent insurance write-off |
| Refunds | Over-collection | Rare; document |

---

## C. Episode timeline dollars (maternity)

Typical **global obstetric** thinking (VERIFY against how *this* practice bills — global vs itemized):

| Phase | Examples of billable work | Often missed if undocumented |
|-------|---------------------------|------------------------------|
| Antepartum | Visits, labs ordered, ultrasounds referral mgmt, high-risk add-ons | Extra visits beyond package; prolonged; NSTs (if done) |
| Intrapartum | Delivery (vaginal / VBAC / etc.), labor management | Assist, repair, prolonged labor — VERIFY codes |
| Postpartum | Visits mother/baby, lactation support if billable | Baby vs mother claims; newborn codes |
| Newborn | Newborn exam, attendance | Separate claim / patient |
| Facility vs professional | Birth center / home vs midwife professional fee | UB-04 vs HCFA — SITE_MAP |
| Supplies / meds | If separately billable under payer rules | Often bundle — VERIFY |

**THINK:** Many midwifery underbills are **missing documentation → missing charges**, not “rate too low.”  
**VERIFY:** Whether WRM bills global 59400-style maternity vs itemized antepartum + delivery + postpartum.

**KNOW (Denise tip):** SuperBill showed **59400** with BCBS Anthem — consistent with vaginal delivery global-style professional claim in ClientCare for that case.

---

## D. Dollar math (reconcile every claim)

```text
Billed
− Contractual adjustment (to allowed)
= Allowed
− Deductible / coinsurance / copay (patient)
− Other payer PR
− Other adjustments (non-covered, etc.)
= Expected payer payment
vs Actual payer payment
→ Variance = underpay / overpay / deny
```

Every open claim needs: **billed, allowed (or expected), paid, patient due, variance, next action.**

---

## E. Where each dollar shows in ClientCare (map link)

| Dollar | Primary surface (SITE_MAP) |
|--------|----------------------------|
| Billed / paid / balance | Review Sent Bills |
| ERA posting | Record Insurance Payment / ERA |
| Aging / chase | Claim Aging, Billing Follow Up, Claim Status |
| Allowed reference | Allowed Amount report |
| Patient plans | Auto Debit Plans |
| Create charges | Charge Slip / Super Bill / HCFA |

---

## Gaps

See [07_GAPS_AND_VERIFY.md](07_GAPS_AND_VERIFY.md) — fee schedule amounts, global vs itemized, secondary workflow, newborn billing rules for WRM.
