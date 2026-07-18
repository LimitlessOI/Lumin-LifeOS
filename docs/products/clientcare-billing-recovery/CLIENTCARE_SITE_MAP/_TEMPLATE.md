<!-- SYNOPSIS: Per-surface ClientCare knowledge card template -->

# SURFACE: {{TITLE}}

| Field | Value |
|-------|-------|
| **Surface id** | `cc.{{domain}}.{{slug}}` |
| **Domain** | billing \| clients \| schedule \| clinical-chart \| reports \| practice-mgmt \| home-queues \| admin |
| **URL** | |
| **Entry paths** | How a human gets here (nav clicks) |
| **Coverage** | UNOPENED \| OPENED \| BUTTONS_PRESSED \| AUTOMATED \| BLOCKED |
| **Last walked** | YYYY-MM-DD |
| **Walked by** | tip-inspect \| local-browser \| human |
| **Depends on** | login, patient selected, billingID, etc. |
| **Destructive?** | no \| soft \| money-moving \| irreversible |
| **Sherry uses for** | (plain English — fill when known) |

---

## What this page is

One paragraph: purpose in ClientCare.

## What this page is not

Boundaries (so we do not invent features).

---

## Controls inventory

### Tabs / sections

| Name | Selector / how to open | Notes |
|------|------------------------|-------|

### Buttons / links (actionable)

| Label | Element | Action when pressed | Side effect | Pressed? |
|-------|---------|---------------------|-------------|----------|
| | a/button/input | | | yes/no/skip |

### Fields

| Label | name/id | Type | Required | Notes |
|-------|---------|------|----------|-------|

### Grids / tables

| Name | Columns | How data loads | Empty state |
|------|---------|----------------|-------------|

### Modals / dialogs

| Trigger | Content | Confirm/Cancel |
|---------|---------|----------------|

### Network / AJAX (if known)

| Method | URL pattern | When |
|--------|-------------|------|

---

## How a human does it (recipe)

1.
2.
3.

## How we automate it (recipe)

| Step | Code/hook | Receipt |
|------|-----------|---------|
| | | |

Known LifeOS entrypoints: `services/clientcare-browser-service.js` / routes under `/api/v1/clientcare-billing/browser/…`

## Failure modes we have seen

| Symptom | Root cause | Fix |
|---------|------------|-----|

---

## Future help (Sherry / Adam — fill later)

Ideas only after map is solid. Examples of the *kind* of thing (not commitments):

- Birth mic → charting / billing notes  
- Appointment listen-in → capture what matters for chart  

| Idea | Who asked | Status |
|------|-----------|--------|
| | | blank |

---

## Evidence

| Date | Source | Artifact |
|------|--------|----------|
| | tip inspect JSON / local prove / screenshot | path or job id |
