<!-- SYNOPSIS: ClientCare complete site-map program — template + doctrine -->

# ClientCare Site Map — Complete Knowledge Program

## Doctrine (Adam / Sherry)

1. **ClientCare already has the product.** We do not rebuild billing, charting, scheduling, or reports.
2. **Step 1 = know the site.** Push every button. Record every surface: what it is, how you get there, what every control does, how we automate it.
3. **Step 2 = finish claims.** Money path must be complete and honest before we expand help ideas.
4. **Step 3 = help layer.** Only after the map exists: what Sherry wants (e.g. birth mic → charting / billing notes; appointment listen-in → capture what matters). Those ideas go in each surface card under **Future help** — empty until she confirms.

## Honesty labels (required on every card)

| Label | Meaning |
|-------|---------|
| `UNOPENED` | URL listed; page not opened this pass |
| `OPENED` | Page loaded; controls inventoried; buttons not all pressed |
| `BUTTONS_PRESSED` | Interactive controls exercised; side effects recorded |
| `AUTOMATED` | LifeOS can drive this path with a receipt |
| `BLOCKED` | Cannot finish without founder/Sherry input or vendor limit |

## How to fill a surface card

Copy `_TEMPLATE.md` → `surfaces/<domain>/<slug>.md`.

1. Open the URL in ClientCare (browser automation or tip `inspect-page`).
2. Inventory **every** link, button, input, select, checkbox, tab, modal.
3. Press each actionable control (or note why skipped — destructive / money / PII).
4. Record network/AJAX if relevant.
5. Write **How a human does it** and **How we automate it**.
6. Leave **Future help** blank until Sherry/Adam decide.

## Folder layout

```text
CLIENTCARE_SITE_MAP/
  README.md                 ← this file
  INDEX.md                  ← master catalog (all surfaces + status)
  _TEMPLATE.md              ← one card template
  CLAIMS_FINISH.md          ← claims-only finish checklist
  surfaces/
    billing/                ← start here
    clients/
    schedule/
    clinical-chart/
    reports/
    practice-mgmt/
    home-queues/
    admin/
    _queue/                 ← discovered but not carded yet
```

## Crawl order (do not skip)

1. **Billing / Claims** (money) — until `CLAIMS_FINISH.md` is all green or BLOCKED with named reason  
2. Reports (non-claims)  
3. Per-client chart (esp. Billing + charting tabs)  
4. Home queues (billing notes, labs, US)  
5. Schedule  
6. Practice Management  
7. Admin / Employee / Account  

## Builder (do this before manual markdown)

| Capability | Status |
|------------|--------|
| Deep page inventory (`buttons`/`inputs`/`selects`/`tabs`) | in `collectPageSummary` |
| Site crawl | `browserService.crawlSiteMap` + `POST /api/v1/clientcare-billing/browser/site-map-crawl` |
| Local runner | `node scripts/clientcare-site-map-crawl.mjs` (needs `CLIENTCARE_*`) |
| Tip async job | `site_map_crawl` (420s timeout); poll `GET .../browser/jobs/:id` |

Crawl fills `evidence/crawl-*.json` then cards under `surfaces/`.

## Related docs

- Prior short map: `../BILLING_UI_MAP.md` (index-style; SITE_MAP cards are the deep template)
- Product home: `../PRODUCT_HOME.md`
- **Money meaning (codes, dollars, underpay):** `../INSURANCE_BILLING_KNOWLEDGE/` — study every dollar; SITE_MAP is where to click
