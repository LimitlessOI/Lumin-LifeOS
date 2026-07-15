<!-- SYNOPSIS: ClientCare surface card — Review Sent Bills -->

# SURFACE: Review Sent Bills

| Field | Value |
|-------|-------|
| **Surface id** | `cc.billing.review_sent_bills` |
| **Domain** | billing |
| **URL** | `/Billing/BillingListView` |
| **Entry paths** | Reports → Claims Billing → Review Sent Bills |
| **Coverage** | AUTOMATED |
| **Last walked** | 2026-07-15 |
| **Walked by** | local-browser + tip-inspect |
| **Depends on** | login; Search must run or grid stays empty |
| **Destructive?** | no (read/filter) |
| **Sherry uses for** | See what was billed / claim progress / balances |

---

## What this page is

Master list of sent bills (HCFA / UB04 / Invoice) with filters and claim progress.

## What this page is not

Default empty grid ≠ “nothing filed.” Must Search / `filterRecords()`.

---

## Controls inventory

| Label | Element | Action | Pressed? |
|-------|---------|--------|----------|
| Search | `#btnSearch` `onclick=filterRecords()` | loads grid | yes |
| filterRecords | JS global | loads grid | yes |
| searchTerm | `#searchTerm` | name filter | yes (Alvarado) |
| This Month / Week / Today | date chips | date range | yes |
| Filter | button | (insufficient alone historically) | skip prefer Search |
| Refresh | grid toolbar | refresh | no |
| HCFA / UB04 / Invoice | type tabs | filter claim type | no |
| Status All/Open/Closed | filter | status | no |
| Pagination | first/prev/next/last | page | no |

### Columns (from UI)

Date, Claim type, Claim number, Name, Email, Insurance, Billed, Paid, Status, Is Auto Debit, Created By, Claim Progress, …

## How a human does it

1. Reports → Review Sent Bills.
2. Pick date range (e.g. This Month).
3. Type client name in search → **Search**.
4. Read rows / open claim links.

## How we automate it

| Step | Hook | Receipt |
|------|------|---------|
| goto BillingListView | soft assign / goto | |
| searchTerm + filterRecords | `mode=sent_bills_only` | Denise `filed:true`, Claim Submitted rows |

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| No items to display | Never Search | Always filterRecords |
| nameHit false with claims present | Probe bug | fixed 2026-07-15 |

## Future help

| Idea | Who asked | Status |
|------|-----------|--------|
| | | blank |
