<!-- SYNOPSIS: Payer + Sherry HCFA format checklist — must pass before a claim is "done" -->

# 10 — Claim format checklist (Sherry path + what payers want)

**Purpose:** After canceling duplicate HCFAs, the **one remaining claim** must match how Sherry files and what insurers expect. Endpoint 200 / “Claim Submitted” alone is **not** done.

**Labels:** KNOW = verified in ClientCare / founder doctrine / cited payer docs this session · THINK = strong inference · VERIFY = needs chart or payer contract.

---

## A. Sherry’s ClientCare path (how she gets a claim to the insurer)

| Step | Where in ClientCare | Why |
|------|---------------------|-----|
| 1 | Chart has birth + insurance demographics | Wrong member ID / missing birth = deny |
| 2 | Charges exist (Charge Slip / Super Bill) with real CPT | Empty HCFA = $0 claim |
| 3 | **HCFA** `/Billing/InvoiceHCFAEdit/{billingId}` | CMS-1500 professional form |
| 4 | Verify patient, insured, DX, line items, POS, providers | Clean claim |
| 5 | **Save** (once — do not Save-loop) | Minting many invoice #s is the failure we just cleaned |
| 6 | Claim Sent Method = **EDI** → Generate EDI | Opens Ally transmit page |
| 7 | Office Ally → Generate (real POST) | Gets to clearinghouse/payer |
| 8 | Optional Claim Sent Date → Save | Tracking |
| 9 | **Review Sent Bills** name + invoice prove | Human-visible proof |

**KNOW:** Automating `InvoiceHCFAEdit?pregnancyID=` without an existing billingId mints a **blank new** invoice. Always open by `{billingId}` after charges exist.

---

## B. What insurance companies want (professional maternity)

Sources consulted 2026-07-15:

- CMS MLN CMS-1500 / 837P professional claim standards
- Anthem maternity reimbursement (global package rules) — [C-19005](https://www.anthembluecross.com/content/dam/digital/docs/provider/commercial/policy/reimb/C-19005.pdf)
- Home birth POS 12 — CMS POS set + Blue Cross VT home birth policy
- Medi-Cal global OB CMS-1500 examples (from–through dates, units=1) — illustrative for global format
- Midwifery CPT bundle notes (59400 / 59425 / 59426 / 59409) — PayerReady midwifery guide
- NV Nurse Midwife PT74 billing guide (Medicaid NM — WRM is CPM; use for POS/NPI patterns only)

### Hard format rules (fail closed)

| # | Field / rule | Required value / rule | Status |
|---|--------------|----------------------|--------|
| 1 | Claim type | **HCFA / CMS-1500** professional (not UB-04 for midwife fee) | KNOW |
| 2 | CPT | **59400** global when same practice did antepartum + vaginal delivery + postpartum; else split codes — never invent | KNOW founder $4900/59400; VERIFY chart ownership of all parts |
| 3 | Charge | **$4,900** for WRM global (founder doctrine) unless contract says otherwise | KNOW doctrine; VERIFY Allowed Amount per payer |
| 4 | Units | **1** for global package line | KNOW (global billing standard) |
| 5 | DOS | Global: **from** = first antepartum for this pregnancy · **to** = delivery date | KNOW (global from–through format) |
| 5b | Box 19 / remarks | Many Medicaid-style payers want prenatal visit dates listed (or attachment) when billing global | THINK — verify per WRM payer contracts |
| 6 | POS | Home birth **12**; birth center **25**; office prenatal **11** | KNOW CMS POS; VERIFY chart birth location |
| 7 | ICD-10 | Delivery / pregnancy DX from **chart** (e.g. O80-class when documented) — never blank | KNOW empty DX = invalid; VERIFY exact codes from chart |
| 8 | Insured | Member ID, name, DOB, relationship, plan | KNOW |
| 9 | Rendering provider | Midwife who delivered (Sherry / Cora as charted) + NPI | KNOW |
| 10 | Billing provider | WRM / group NPI as credentialed | VERIFY taxonomy/group on every payer |
| 11 | Facility | Home / WRM / birth center matching POS | THINK |
| 12 | Transmit | **EDI** via Office Ally Generate success | KNOW Denise path |
| 13 | Progress | Claim Submitted only **after** real EDI, not after empty Save | KNOW |
| 14 | One invoice | Exactly **one** open HCFA per pregnancy episode we are collecting on | KNOW founder crisis rule |

### Anthem / commercial global note (THINK — verify per contract)

If the same TIN did **not** render all antepartum + delivery + postpartum, **do not** bill 59400 — bill only the parts performed (59425/59426, 59409, 59430, etc.). Anthem maternity policy states overlapping/duplicate global elements are not reimbursed.

---

## C. Automated gate (must pass before “filed”)

A claim is **format-pass** only if all are true:

1. `BillingID` is a real GUID (not `00000000-…`)
2. Invoice # present
3. ≥1 diagnosis ICD-10 filled
4. ≥1 CPT line with charge > 0 (WRM global → 59400 @ 4900 when applicable)
5. POS set and matches birth setting
6. Rendering + billing providers selected
7. Insured member ID non-empty
8. Claim Sent Method = EDI **and** Sent Bills / Ally prove (not status-only)
9. No sibling Open/Claim Submitted duplicates for that pregnancy (keep-one)

**FAIL examples seen tip 2026-07-15:**

| Invoice | Patient | Failure |
|---------|---------|---------|
| 439931 (kept) | Amanda Winkels | Claim Submitted + **$0** + **empty CPT/DX** — not a payer-valid claim |
| 440078 | ONeill | same empty Claim Submitted shell |
| 440185 | Moreno | same |
| 440034 | Mon (BrookLynn) | same (message mislabeled “alvarado” — short-name bug; chart was Mon pregnancy_id) |
| 440076 | Labelle | same |
| 440182 | Loya | same |
| 439949 | Leyv | same |
| 440241 | Carol Avila | empty shell; chart then cleared to **0 open** (correct — not delivered) |

**Repair rule:** Empty Claim Submitted shells must be **deleted** (`keep_none` / `InvoiceListDelete`), then one claim filed only after SuperBill has real CPT+DX and format gate passes. Do not re-EDI an empty form.

---

## D. Repair order when format fails

1. Keep-one cancel until ≤1 open HCFA on Pregnancy/Billing.
2. Open remaining `{billingId}` — if empty shell → **delete** (`InvoiceListDelete`) or Close; do **not** leave Claim Submitted empty.
3. Build charges from chart (Charge Slip / Super Bill) → open that billingId → fill checklist → Save once → EDI → prove.
4. Re-run format gate.

---

## E. Still VERIFY with Sherry / contracts

See `07_GAPS_AND_VERIFY.md`. Especially: taxonomy on commercial claims, newborn separate claim, UB-04 facility, payer-specific auth for home birth.
