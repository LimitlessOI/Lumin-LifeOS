<!-- SYNOPSIS: Live ClientCare West billing UI map (tip-proved 2026-07-14) -->

# ClientCare West — Billing UI Map

**Source:** tip browser login + discover/inspect on `https://clientcarewest.net` (Railway `CLIENTCARE_*`).  
**Proved:** 2026-07-14 after founder-lane mount of `/api/v1/clientcare-billing`.

## Login

| Item | Value |
|------|--------|
| Base | `CLIENTCARE_BASE_URL` → `clientcarewest.net` |
| Login test | `POST /api/v1/clientcare-billing/browser/login-test` → **PASS** |
| MFA env | not set; login succeeded without MFA challenge |

## Primary billing nav (money path)

| Control | URL | Tip evidence |
|---------|-----|----------------|
| Home / Billing partial | `/Home/BillingPartial` | Landing after login; **91 New Billing Notes** |
| Billing Slip (charge slip) | `/Company/ChargeSlip` | Reachable; create/print charge slips |
| Record Insurance Payment (ERA) | `/Billing/RecordRemittanceAdvice` | Remittance Report (ERA) |
| Review Sent Bills | `/Billing/BillingListView` | Filters: Status All/Open/Closed; claim type HCFA/UB04/Invoice; columns Date, Claim #, Insurance, Billed, Paid, Balance |
| HCFA editor | `/Billing/InvoiceHCFAEdit` | Professional claim form |
| UB-04 editor | `/Billing/InvoiceUB04Edit` | Facility claim form |
| Client invoice editor | `/Billing/InvoiceClientInvoiceEdit` | Patient invoice |
| Clients / list | `/Pregnancy` | Client directory |
| Create New Client | `/Pregnancy/Start` | Intake |
| Birth Activity | `/Home/BirthActivityPartial` | Births list (AJAX-heavy) |
| Reports | `/Report` / `/Report/Index` | Claim aging, AR, billing audit, etc. (AJAX) |
| Front Desk Notes | `/Provider/DeskNoteListView` | Desk notes |
| New Note | `/Provider/DeskNoteEdit` | Create note |
| Labs & U/S | `/Home/LabsUSPartial` | Not billing; noise on home |

## Review Sent Bills — filters / columns (map these as “API”)

**Filters:** Status (All / Open / Closed), Filter by Date (Claim Date), claim type tabs **HCFA | UB04 | Invoice**, Filter, Refresh, pagination.

**Columns:** Date, Claim type, Claim number, Name, Email, Insurance, Billed, Other Adj, Paid, Balance, Status, Is Auto Debit, Auto Send, Client Type, Client Status, Proforma, …

**Tip state (2026-07-14):** grid present but **no open claim rows** in default view (`noItems` / empty body). Money backlog is **not** sitting in Sent Bills — it is in **Billing Notes**.

## Billing Notes queue (primary rescue surface)

| Signal | Tip value |
|--------|-----------|
| Dashboard | **91 New Billing Notes** (also 644 labs / 115 ultrasounds — ignore for billing) |
| Transport | `GET /api/v1/clientcare-billing/browser/billing-notes-transport` PASS |
| API pattern | `/Home/GetMidwifeNotesList/` (captured by browser service) |
| Backlog summary | `GET .../browser/backlog-summary` → **91 queue items / 50 accounts** sampled |
| Classifier (sample) | ~half `needs_review`, ~half `insurance_setup_issue`; top action = enter/verify insurer |
| Age of notes in sample | mostly **2018–2022** (not under-90-day births) |

**Implication:** Recent unpaid births may be **unbilled / never claimed**, not in this old notes queue. Next probes: Reports (claim aging, AR, missing transaction, billing progress), Birth Activity → per-client Billing tab, ChargeSlip for unbilled encounters.

## LifeOS operator endpoints (now on founder tip)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/clientcare-billing/clientcare/readiness` | Secrets + workflow templates |
| POST | `/browser/login-test` | Prove login |
| POST | `/browser/discover` | Walk billing surface |
| POST | `/browser/inspect-page` | Single URL map |
| GET | `/browser/billing-notes-transport` | Notes AJAX transport |
| GET | `/browser/scan-billing-notes` | Notes scan (edge may 502 — needs async) |
| GET | `/browser/account-report` | Rescue cards |
| GET | `/browser/full-account-report` | Full backlog |
| GET | `/browser/backlog-summary` | Counts + playbooks |
| Overlay | `/clientcare-billing` | Sherry/Tiller UI |

## Vendor AI (ClientCare embedded)

Marketing: **AI-assisted charting** (+ optional audio) — clinical charting, **not** a billing API.  
**Reuse in our system:** none as an API. Our path stays Puppeteer + LifeOS **Tiller** / AI Council for VOB, claim drafts, and queue coaching. Do not wait on ClientCare AI for insurance money.

## Next execution (money)

1. `GET .../browser/birth-activity?async=true` → poll job → recent births with `billingHref` (directory resolve after Clear filter / View all).  
2. `POST .../browser/prepare-claim-status` with those hrefs (`Claims Processing` + `CPM`).  
3. Inspect each billing tab → charge slip `/Company/ChargeSlip` / HCFA → submit when insurance complete.  
4. Reports aging remains secondary once birth→billing path is flowing.
