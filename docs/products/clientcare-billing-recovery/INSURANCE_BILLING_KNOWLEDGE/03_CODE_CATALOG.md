<!-- SYNOPSIS: Midwifery CPT/ICD/modifier/POS catalog for WRM billing -->

# 03 — Code catalog (CPT / ICD / modifiers / POS)

**Honesty:** Only Denise-era ClientCare evidence is `KNOW`. Everything else is `THINK` / `VERIFY` against WRM fee schedule in ClientCare (`/Services/Edit`, CPT by Provider report, Allowed Amount).

---

## A. Maternity professional codes (common midwifery) — VERIFY before use

| Code | Rough meaning | Notes | Status |
|------|---------------|-------|--------|
| **59400** | Routine obstetric care incl. antepartum, vaginal delivery, postpartum | Global-style | **KNOW** seen on Denise SuperBill (BCBS) |
| **59409** | Vaginal delivery only | When antepartum/postpartum billed elsewhere | THINK — tip code preference mentioned 59409/59400 |
| **59410** | Vaginal delivery + postpartum | VERIFY |
| **59510** | C-section global | If applicable / transfer | VERIFY |
| **59610** / **59612** | VBAC-related | VERIFY |
| **59425** / **59426** | Antepartum only (4–6 / 7+ visits) | After transport / hospital delivery global when midwife did prenatal — see `09_TRANSPORT_AND_PRENATAL.md` | KNOW doctrine; visit count VERIFY chart |
| Postpartum only (e.g. 59430) | Postpartum care only | VERIFY |
| **59025** | Fetal NST | If performed / separately billable | VERIFY |
| E/M codes (9921x/9920x) | Problem visits outside global | Easy underbill if undocumented | VERIFY global rules |
| Newborn attendance / care | Separate from mother | VERIFY baby claim path |
| Laceration repair | Sometimes bundled in delivery | VERIFY payer |

**KNOW tip preference:** Prefer **59409/59400** over **59080** for Denise ChargeSlip path (59080 was wrong tool for that money path).

---

## B. Diagnosis (ICD-10) — examples

| Code | Rough meaning | Status |
|------|---------------|--------|
| **O80** | Encounter for full-term uncomplicated delivery | THINK — paired with delivery claims often |
| Pregnancy encounter Z34.* / O09.* | Supervision / high-risk | VERIFY chart |
| Complications (O***) | Only if documented | Never code from guess |

**Denise path:** Delivery-related DX expected on HCFA; exact ICD list VERIFY from her claim dump.

---

## C. Modifiers (revenue + compliance) — VERIFY

| Modifier | When it matters | Risk if wrong |
|----------|-----------------|---------------|
| **22** | Increased procedural service | Must have documentation |
| **25** | Significant E/M same day as procedure | Overuse = audit |
| **51** / **59** / **XS** etc. | Multiple / distinct procedures | NCCI unbundling |
| **GC** / teaching | If applicable | n/a midwifery usually |
| **Home birth / POS-related** | Payer-specific | VERIFY |

Do not “add modifiers to increase bill” without documentation + payer policy.

---

## D. Place of service (POS)

| POS | Setting | Status |
|-----|---------|--------|
| **12** | Home | Common home birth — tip ChargeSlip preferred POS 12 in one path |
| **11** | Office | Prenatal visits |
| **25** | Birthing center | If used |
| **21/22/23** | Hospital / OP / ED | Transfers |

Wrong POS → deny or wrong rate.

---

## E. Facility vs professional

| Claim type | ClientCare | When |
|------------|------------|------|
| HCFA (CMS-1500) | InvoiceHCFAEdit | Professional midwife fee |
| UB-04 | InvoiceUB04Edit | Facility charges if WRM bills facility |
| Client invoice | InvoiceClientInvoiceEdit | Patient bill |

**VERIFY:** Does WRM bill facility UB-04 for birth center / home supplies, or professional-only?

---

## F. Practice fee schedule source of truth

1. ClientCare procedure list / fees (`/Services/Edit`)  
2. Allowed Amount report (payer contracted)  
3. Super Bill fee column  
4. Written payer contracts (outside ClientCare) — **must obtain**

Until fee schedule is exported into this folder, amounts stay `DONT_KNOW`.
