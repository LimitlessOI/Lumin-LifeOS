<!-- SYNOPSIS: ClientCare surface card — Billing Follow Up -->

# SURFACE: Billing Follow Up

| Field | Value |
|-------|-------|
| **Surface id** | `cc.billing.billing_follow_up` |
| **Domain** | billing |
| **URL** | `/Billing/BillingFollowUp` |
| **Entry paths** | Reports → Claims Billing → this item |
| **Coverage** | OPENED |
| **Last walked** | 2026-07-15 |
| **Walked by** | tip-inspect |
| **Depends on** | ClientCare login |
| **Destructive?** | soft (filters); money-moving only if post/submit pressed |
| **Sherry uses for** | TBD |

---

## What this page is

Follow-up call reminder grid

## What this page is not

Not a LifeOS-built biller. Vendor ClientCare UI only.

## Controls inventory

### Headings seen

- Follow-up Call Reminder

### Links / actions seen

| Label | Href | Pressed? |
|-------|------|----------|
| ← | `javascript:void(0);` | no |
| « | `javascript:void(0);` | no |
| 1 | `javascript:void(0);` | no |
| » | `javascript:void(0);` | no |
| → | `javascript:void(0);` | no |

### Text preview (evidence)

```
Follow-up Call Reminder
Follow-up	Note Date	Regarding	Notes	Client/Ins	
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
 	 	 	 	 	 
  Loading ...
←
«
1
»
→
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
| 2026-07-15 | tip inspect | `_Billing_BillingFollowUp.json` |
