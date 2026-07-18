<!-- SYNOPSIS: ClientCare surface card — Send HCFA EDI (Ally transmit) -->

# SURFACE: Send HCFA EDI (Office Ally)

| Field | Value |
|-------|-------|
| **Surface id** | `cc.billing.send_hcfa_edi` |
| **Domain** | billing |
| **URL** | `/Billing/SendHCFAEDIEdit?billingID={guid}` |
| **Entry paths** | HCFA editor → EDI tab → Generate EDI link → this page |
| **Coverage** | AUTOMATED |
| **Last walked** | 2026-07-15 |
| **Walked by** | local-browser + tip SHA `032b85983b` |
| **Depends on** | Saved HCFA with real `billingID`; jQuery present (inject if missing) |
| **Destructive?** | money-moving (transmits EDI to clearing house) |
| **Sherry uses for** | Electronic claim submit via Office Ally |

---

## What this page is

Vendor page that builds/sends HCFA EDI to the selected clearing house (Office Ally - wrmomma).

## What this page is not

Not inside `#divSendEDI` on the HCFA form. Ally select lives **here**.

---

## Controls inventory

### Buttons / links

| Label | Element | Action when pressed | Side effect | Pressed? |
|-------|---------|---------------------|-------------|----------|
| Generate | `button.primarySave` `type=submit` `onclick=return SetSelectionEDI();` | Runs SetSelectionEDI then **form POST** | `POST /Billing/SendHCFAEDIEdit` → `{"success":true}` | yes |
| HCFA EDI | tab | UI only | none | yes |

### Fields

| Label | name/id | Type | Required | Notes |
|-------|---------|------|----------|-------|
| Clearing House | `ClearingHouseSettingID` | select | yes | `Office Ally - wrmomma` |
| Charts / include checkboxes | PrenatalFlow_*, Labs_*, etc. | checkbox | no | SetSelectionEDI packs checked into JSON |
| Hidden | `JsonStrForChartsIncludedEDI`, `ChartsIncludedEDI`, `BillingID` | hidden | | Filled by SetSelectionEDI |
| Notes | `Note` | text | no | |

### Network

| Method | URL | When |
|--------|-----|------|
| GET | `/Billing/SendHCFAEDIEdit?billingID=` | open page |
| POST | `/Billing/SendHCFAEDIEdit` | Generate submit |

---

## How a human does it

1. On HCFA, Save → Continue → set claim method EDI.
2. Open EDI / click **Generate EDI** (gets `billingID` href).
3. Land on SendHCFAEDIEdit → pick Office Ally.
4. Click **Generate** (submit). Expect success JSON / return to claim flow.
5. Confirm on Review Sent Bills (Search required).

## How we automate it

| Step | Code/hook | Receipt |
|------|-----------|---------|
| Nav after Generate EDI href | `clientcare-browser-service` `nav_send_hcfa_edi` | local + tip |
| Inject jQuery if `$` missing | `addScriptTag` jquery-3.6.0 | local KNOW |
| Ally select | `#ClearingHouseSettingID` | proved |
| SetSelectionEDI + submit click | `generateVia: SetSelectionEDI+submit_click` | POST 200 success |
| Sent Bills prove | `#searchTerm` + `filterRecords()` | Denise nameHit + Claim Submitted |

## Failure modes we have seen

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Ally never appears | Waited on `#divSendEDI` only | Navigate SendHCFAEDIEdit |
| `$ is not defined` | Page missing jQuery | Inject jQuery |
| success never / Sent Bills empty | Called SetSelectionEDI without form submit | Always click submit |
| Probe nameHit false | Never called Search | filterRecords / #btnSearch |

## Future help

| Idea | Who asked | Status |
|------|-----------|--------|
| | | blank |
