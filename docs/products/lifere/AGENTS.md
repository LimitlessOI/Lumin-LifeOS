<!-- SYNOPSIS: Cold-agent entry — LifeRE canonical authority -->

# LifeRE — Agent Entry

**You are in the LifeRE product lane.**

## Read order (mandatory)

1. `docs/products/lifere/PRODUCT_HOME.md` — **canonical product truth**
2. `docs/products/lifere/FILE_MANIFEST.json` — owned paths + `@ssot` targets
3. `docs/products/AUTHORITY_BOUNDARIES.md` — canonical vs history
4. `docs/products/lifere/PRODUCT_HOME.md` — law / receipts only (not first product read)

## Do not treat as product authority

- `docs/products/LIFERE.md` — redirect stub only
- `docs/LIFERE_GAP_AUDIT.md` — **historical snapshot** (2026-06-13); re-probe before capability claims
- `builderos-reboot/MISSIONS/*/CONTENT/**` — mission snapshots
- `docs/conversation_dumps/**` — research archives

Verify before commit: `npm run lifeos:product-home:verify`
