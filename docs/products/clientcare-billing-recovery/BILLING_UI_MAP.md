<!-- SYNOPSIS: ClientCare West full ops + billing map (honest coverage) -->

# ClientCare West — Function Map (Sherry coworker)

**Deep template program (2026-07-15):** Use `CLIENTCARE_SITE_MAP/` for complete per-surface cards (push every button). This file remains the short index; SITE_MAP is the knowledge template.

**Doctrine:** ClientCare already has billing and practice ops. We do **not** rebuild that. We map every surface, then push the right buttons for Sherry.

**Honesty rule:** Coverage labels below are mandatory. Missing a control (like Sent Bills Search) is how we lied to ourselves about Denise.

| Label | Meaning |
|-------|---------|
| **PROVED** | Logged in, walked UI, automation or manual prove of the real control |
| **URL_KNOWN** | Link/URL seen live; buttons/filters inside **not** fully walked |
| **PARTIAL** | Some controls known; gaps remain |
| **UNMAPPED** | Exists in product; we have not opened it carefully yet |

**Sources:** tip discover/inspect 2026-07-14 + deep report/chart crawl 2026-07-15 + Denise EDI local prove 2026-07-15.  
**Base:** `https://clientcarewest.net` (Railway `CLIENTCARE_*`).

---

## Coverage verdict (read this first)

| Question | Answer |
|----------|--------|
| Have we mapped **every** ClientCare function? | **No.** |
| Have we mapped **primary billing money path** end-to-end? | **PARTIAL → mostly PROVED** for HCFA EDI → Ally → Sent Bills |
| Did we miss important billing controls? | **Yes.** `SendHCFAEDIEdit`, `SetSelectionEDI` form POST, Sent Bills `#searchTerm` + `filterRecords()` / `#btnSearch`, Claim Sent Date datepicker |
| Step 1 for Sherry? | Drive ClientCare buttons. Not a parallel billing engine. |

---

## Critical billing path (money) — status

```text
Client chart / Birth / ChargeSlip
  → Daily Super Bill / SuperBillReport (optional)
  → InvoiceHCFAEdit (Save → Continue)
  → Claim Sent Method = EDI
  → #divEDI / Generate EDI link
  → /Billing/SendHCFAEDIEdit?billingID=…
  → ClearingHouseSettingID = Office Ally - wrmomma
  → Generate submit (SetSelectionEDI + form POST)
  → {"success":true}
  → Review Sent Bills (/Billing/BillingListView)
       MUST: #searchTerm + filterRecords() / #btnSearch
```

| Step | Coverage | Notes |
|------|----------|-------|
| Login | **PROVED** | No MFA in current vault |
| ChargeSlip select patient + codes | **PARTIAL** | Tip often wedges; local/path fragile |
| Daily Super Bill / SuperBillReport | **PARTIAL** | Denise 59400 seen; Create Claim flaky on tip |
| InvoiceHCFAEdit fill/save | **PROVED** | Denise BCBS / insured spouse path |
| Send via EDI / Generate EDI reveal | **PROVED** | Ally not in `#divSendEDI` until Generate EDI |
| `SendHCFAEDIEdit` + Ally select | **PROVED** | Missed in early map |
| Generate = form POST | **PROVED** | `SetSelectionEDI` alone does **not** submit |
| Claim Sent Date stamp | **PARTIAL** | Field is jQuery datepicker; persist after Save inconsistent when new invoice spins up |
| Review Sent Bills prove | **PROVED** | Earlier probes false-negative without Search |

---

## Top nav (practice shell)

| Area | URL | Coverage | Sherry job |
|------|-----|----------|------------|
| Home | `/` | **PARTIAL** | Alerts: labs, US, billing notes, due clients |
| Clients | `/Pregnancy` | **PARTIAL** | Directory / open chart |
| Create New Client | `/Pregnancy/Start` | **URL_KNOWN** | Intake |
| Schedule | `/Scheduler` | **URL_KNOWN** | Day/week; CORA + SHERRY columns seen |
| Reports | `/Report` / `/Report/Index` | **URL_KNOWN** menu; insides uneven | Ops + billing reports hub |
| Billing home partial | `/Home/BillingPartial` | **PARTIAL** | Billing Notes queue |
| Birth Activity | `/Home/BirthActivityPartial` | **PARTIAL** | Recent births |
| Notes | `/Home/NotesPartial` | **URL_KNOWN** | Midwife notes |
| Labs & U/S | `/Home/LabsUSPartial` | **URL_KNOWN** | Not billing |
| Front Desk Notes | `/Provider/DeskNoteListView` | **URL_KNOWN** | Desk notes |
| New Note | `/Provider/DeskNoteEdit` | **URL_KNOWN** | Create note |
| Practice Management | `/PracticeManagement` | **URL_KNOWN** | Manuals, CABC, payor docs |
| Employee Log | `/Employee` | **URL_KNOWN** | Hours / payroll inputs |
| Manage Account | `/Company/Edit` | **URL_KNOWN** | Company settings |
| Review All Faxes | `/Company/FaxReport` | **URL_KNOWN** | Fax sent/received |

---

## Reports menu — Claims Billing (live from `/Report`)

These are the report **names** ClientCare exposes. Most are **URL_KNOWN** only (opened hub; not each report’s filters/export walked).

| Report | Path (relative) | Coverage |
|--------|-----------------|----------|
| Claim Status | `/Company/BillingManagementReport` | **URL_KNOWN** |
| Review Sent Bills | `/Billing/BillingListView` | **PROVED** (with Search) |
| Accounts Receivable | `/Billing/AccountReceivableReportCommon` | **URL_KNOWN** |
| Billing Audit | `/Billing/BillingAuditReport` | **URL_KNOWN** |
| Claim Aging Summary | `/Billing/ClaimTrackingSummaryReport` | **URL_KNOWN** |
| Billing Progress Checklist | `/BillingProgressChecklist/BillingProgressReport` | **URL_KNOWN** |
| New Client Checklist | *(on Reports hub — exact path TBD)* | **UNMAPPED** |
| Daily Payments | *(hub)* | **UNMAPPED** |
| Merchant Account Transactions | *(hub)* | **UNMAPPED** |
| Remittance Report (ERA) | `/Billing/RecordRemittanceAdvice` | **PARTIAL** (page open; post ERA **UNMAPPED**) |
| Allowed Amount | `/Billing/AllowedAmountReport` | **URL_KNOWN** |
| CPT Codes by Provider | `/Billing/CPTCodeByProviderReport` | **URL_KNOWN** |
| Auto Debit Plans | `/Billing/AutoDebitPlanReport` | **URL_KNOWN** |
| Super Bill | `/Billing/SuperBillReport` | **PARTIAL** |
| Billing Follow Up | `/Billing/BillingFollowUp` | **URL_KNOWN** |
| Missing Transaction Report | *(named on hub)* | **UNMAPPED** |
| Sent Corrected Claims | *(named historically)* | **UNMAPPED** |

### Reports — Client Management / other (Sherry ops, not claim submit)

| Report | Path | Coverage |
|--------|------|----------|
| Active Client | `/Pregnancy/BirthTeamReport` | **URL_KNOWN** |
| Advanced Client List | `/Pregnancy/ClientListReport?donotRedirect=Y` | **PARTIAL** — wired into `searchClientDirectory` chart recovery (past births) |
| Client Appointment Details | `/Scheduler/ClientVisitReport` | **URL_KNOWN** |
| Midwife Birth Totals | *(hub)* | **UNMAPPED** |
| Midwife Appointment Totals | *(hub)* | **UNMAPPED** |
| Medication / Prescription / ePrescribe | *(hub)* | **UNMAPPED** |
| Incoming Labs | *(hub)* | **UNMAPPED** |
| CABC Statistics | `/Company/CABCStatisticsReport` | **URL_KNOWN** |
| Custom Checklist | *(hub)* | **UNMAPPED** |
| Text Campaign Response | *(hub)* | **UNMAPPED** |
| Birth Log Report | `/Report/BirthLogsReport` | **PARTIAL** — wired into `searchClientDirectory` when Clients + Advanced List miss |
| Client Demographics | `/Pregnancy/ClientDemograhicReportNewFormat` | **URL_KNOWN** |
| Demographic Statistics | *(hub)* | **UNMAPPED** |
| Employee Payroll / Other Earnings / Reimbursements | `/Employee` + report links | **URL_KNOWN** shell |

---

## Billing create / edit surfaces

| Surface | URL | Coverage |
|---------|-----|----------|
| Billing Slip (Charge Slip) | `/Company/ChargeSlip` | **PARTIAL** |
| HCFA editor | `/Billing/InvoiceHCFAEdit` (+ `?pregnancyID=` / `/{billingId}`) | **PROVED** |
| UB-04 editor | `/Billing/InvoiceUB04Edit` | **URL_KNOWN** (not walked for Denise) |
| Client invoice | `/Billing/InvoiceClientInvoiceEdit` | **URL_KNOWN** |
| Send HCFA EDI | `/Billing/SendHCFAEDIEdit?billingID=` | **PROVED** (was missing from early map) |
| Record Insurance Payment / ERA | `/Billing/RecordRemittanceAdvice` | **PARTIAL** |
| Procedure / Dx code admin | `/Services/Edit`, `/Services/DiagnosisCodeEdit/` | **URL_KNOWN** |

### HCFA / EDI controls we missed earlier (now PROVED)

| Control | Where | Why it mattered |
|---------|-------|-----------------|
| Generate EDI `<a href=SendHCFAEDIEdit?billingID=>` | `#divSendEDI` | Ally does **not** live on the HCFA panel |
| `ClearingHouseSettingID` | SendHCFAEDIEdit | Office Ally - wrmomma |
| `SetSelectionEDI()` | Generate button onclick | Only fills hidden chart JSON — **does not POST** |
| Generate `type=submit` form POST | `/Billing/SendHCFAEDIEdit` | Real transmit; returns `{"success":true}` |
| jQuery on Send page | often missing | Must inject or `$` throws |
| `#searchTerm` + `filterRecords()` / `#btnSearch` | BillingListView | Grid stays empty until Search |
| `ClaimSentDate` | InvoiceHCFAEdit | jQuery UI datepicker (`hasDatepicker`) |

---

## Per-client chart (Sherry daily work)

Example walked: Denise `…/Pregnancy/Billing/{pregnancyId}` and General chart.

| Chart area | Coverage | Notes |
|------------|----------|-------|
| Client Summary / Notable Issues / Message Center / Portal | **URL_KNOWN** | Tabs seen |
| Call Log / Consultation / Referral & Orders | **URL_KNOWN** | |
| Lab Order / Meds / Check Lists / Newborn | **URL_KNOWN** | |
| **Billing** tab | **PARTIAL** | Billing Info hash `#tabs-billing` |
| Admit / Discharge / Transfer / Print & Fax / Custom Forms / Telehealth | **URL_KNOWN** | |
| Consent & Docs / Ext. Medical Records | **URL_KNOWN** | |
| History & Labs / Exams / Prenatal Care | **URL_KNOWN** | Clinical — map for completeness, not money path |

**UNMAPPED inside Billing tab:** insurance card edit, guarantor, payment plans, charge list vs claims list, “prepare claim status” UI details, portal billing statements.

---

## Home queues (ops load)

| Queue | Tip signal (2026-07-14/15) | Coverage |
|-------|----------------------------|----------|
| New Billing Notes | **91** | **PARTIAL** (transport + sample classify) |
| New Labs | **644** | **URL_KNOWN** |
| New Ultrasounds | **115** | **URL_KNOWN** |
| Due clients / alerted charts / chats / service tickets | loading on home | **UNMAPPED** |

---

## Practice Management (Sherry compliance ops)

From `/PracticeManagement` menu (all **URL_KNOWN** unless noted):

- Operational Manuals, Company Documents, Maintenance Logs  
- Meetings and Drills, Supplies & Inventory  
- Payor Communications, CABC Check Lists  
- Policy & Procedure Manual, Practice Guidelines, Employee Handbook  
- Emergency Plan, Material Safety Sheets  

**Not billing.** Needed if “manage ClientCare for Sherry” means whole practice, not only claims.

---

## LifeOS automation already pointed at ClientCare

| Capability | Status |
|------------|--------|
| Login / discover / inspect-page | Works (discover only walks ~2–4 candidates — **too shallow** for full map) |
| Billing notes scan / backlog | Partial |
| ChargeSlip map / SuperBill / file-superbill-claim | Partial; Denise EDI+Sent Bills **local PROVED** |
| VOB transcript → note suggestion | Exists; paste/apply gated |
| Forever-chase birth queue | Seeded; not every birth auto-billed |

---

## Explicit gap list (do next — no theater)

### Billing (priority)

1. Walk **each** Claims Billing report: filters, export, what Sherry uses weekly.  
2. Full **ERA / Record Insurance Payment** post path (apply remits to claims).  
3. **UB-04** and **client invoice** paths (when HCFA is wrong tool).  
4. **Billing Follow Up** + **Claim Status** + **Claim Aging** as forever-chase surfaces.  
5. **Auto Debit / Daily Payments / Merchant** (patient-pay side).  
6. Chart **Billing tab** field map (insurance, charges, statements).  
7. Stop creating duplicate HCFAs on every debug Save (Denise racked many 4398xx).

### Whole-ClientCare coworker (after money path stable)

8. Scheduler create/move/cancel appointments.  
9. Front desk notes + home “due clients” triage.  
10. Labs/US review queue (huge backlog).  
11. Practice Management / Payor Communications.  
12. Deepen `discover` beyond 4 candidates — crawl Reports + chart tabs systematically.

---

## Next execution (ordered)

1. **Keep doctrine:** buttons in ClientCare, not a new biller.  
2. Freeze money path as the proven EDI → Ally → Sent Bills recipe; tip job must use Search.  
3. Map **ERA + AR + Claim Aging + Billing Follow Up** next (Sherry’s post-submit work).  
4. Only then expand to schedule/labs/practice-mgmt automation.

---

## Change log

| Date | What |
|------|------|
| 2026-07-14 | Initial tip money-path map (ChargeSlip, Sent Bills, notes). |
| 2026-07-15 | Denise prove exposed missing EDI page + Sent Bills Search. |
| 2026-07-15 | Deep hub crawl: full Reports Claims Billing list + chart/Practice/Scheduler shells; honest PROVED/URL_KNOWN/UNMAPPED labels. |
