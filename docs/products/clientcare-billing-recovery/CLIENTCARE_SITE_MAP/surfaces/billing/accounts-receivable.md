<!-- SYNOPSIS: ClientCare surface card — Accounts Receivable -->

# SURFACE: Accounts Receivable

| Field | Value |
|-------|-------|
| **Surface id** | `cc.billing.accounts_receivable` |
| **Domain** | billing |
| **URL** | `/Billing/AccountReceivableReportCommon` |
| **Entry paths** | Reports → Claims Billing → this item |
| **Coverage** | OPENED |
| **Last walked** | 2026-07-15 |
| **Walked by** | tip-inspect |
| **Depends on** | ClientCare login |
| **Destructive?** | soft (filters); money-moving only if post/submit pressed |
| **Sherry uses for** | TBD |

---

## What this page is

AR report

## What this page is not

Not a LifeOS-built biller. Vendor ClientCare UI only.

## Controls inventory

### Headings seen

- Reports
- Record Insurance Payment
- Account Receivable Report
- Inactivity Alert
- Input Signature

### Links / actions seen

| Label | Href | Pressed? |
|-------|------|----------|
| Front Desk Notes | `/Provider/DeskNoteListView` | no |
| New Note | `/Provider/DeskNoteEdit` | no |
| WRM LLC | `/Billing/AccountReceivableReportCommon#` | no |
| Create New Client | `/Pregnancy/Start` | no |
| Billing Slip | `/Company/ChargeSlip` | no |
| View Client List | `/Pregnancy?donotRedirect=Y` | no |
| Record Insurance Payment | `/Billing/RecordRemittanceAdvice` | no |
| Review Sent Bills | `/Billing/BillingListView` | no |
| Review All Faxes | `/Company/FaxReport` | no |
| Manage Account | `/Company/Edit` | no |
| Practice Management | `/PracticeManagement` | no |
| Employee Log | `/Employee` | no |
| My Profile | `/Employee/UserInfo` | no |
| Sign Out | `/Account/LogOff` | no |
| English | `javascript:void(0)` | no |
| Spanish | `javascript:void(0)` | no |
| French | `javascript:void(0)` | no |
| Italian | `javascript:void(0)` | no |
| German | `javascript:void(0)` | no |
| Portuguese | `javascript:void(0)` | no |
| Russian | `javascript:void(0)` | no |
| Dutch | `javascript:void(0)` | no |
| Ukrainian | `javascript:void(0)` | no |
| Help Center | `https://clientcarev2.atlassian.net/servicedesk/customer/portal/1/article/291799061` | no |
| Service Ticket | `/SupportTicket` | no |
| Latest Updates | `javascript:void(0)` | no |
| Filter | `/Billing/AccountReceivableReportCommon#` | no |
| Terms of Use | `https://clientcare.net/terms-of-use/index.html` | no |
| Privacy Policy | `http://clientcare.net/privacy-policy/index.html` | no |
| Click Here To Log Out | `/Account/LogOff` | no |
| Click Here to Continue Working | `/Billing/AccountReceivableReportCommon#` | no |

### Text preview (evidence)

```
Home 
Clients
 Schedule Reports
 
WRM LLC 
Cora
Account Receivable Report
Home / Reports / Account Receivable Report
Filter 
 	 	 	Baby	Place Of Care	 	 		Claim	 		 	 	 	 	 		 	Amount	 	 	Days	Last
 	
Name
	EDD	DOB	Plan/Actual	Claim#	Date	
Insurance
	Type	
Description
	Billed	
(0-30)	
(31-60)	
(61-90)	
(91-120)
	
(120+)
	Discount	
Balance
	Paid	
Remarks
	
Status
	
Old
	
Modified

 	Total Clients for report : 0	Totals for report:										Report Date : 07/15/2026


Text Messages
  Back
	
	Send	

ARAGON Software - © ClientCare.net v1.2 | Terms of Use | Privacy Policy
```

## How a human does it (recipe)

1. Login to ClientCare.
2. Open Reports → Claims Billing → this report (or Billing nav equivalent).
3. Set filters → Filter / Search / Refresh as shown.
4. Act on rows — **BUTTONS_PRESSED pass still required** (tip inspect did not press Filter/Search/row actions this pass).

## How we automate it (recipe)

| Step | Code/hook | Receipt |
|------|-----------|---------|
| Open + inventory | `POST /api/v1/clientcare-billing/browser/inspect-page` | tip 2026-07-15 |
| Push every button | next pass after richer control inventory on tip | pending |

## Future help (Sherry / Adam — fill later)

| Idea | Who asked | Status |
|------|-----------|--------|
| | | blank |

## Evidence

| Date | Source | Artifact |
|------|--------|----------|
| 2026-07-15 | tip inspect | `_Billing_AccountReceivableReportCommon.json` |
