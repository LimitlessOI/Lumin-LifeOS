<!-- SYNOPSIS: Cold-agent entry — LifeOS canonical authority -->

# LifeOS — Agent Entry

**You are in the LifeOS product lane.**

## Read order (mandatory)

1. `docs/products/lifeos/PRODUCT_HOME.md` — **canonical product truth**
2. `docs/products/lifeos/FILE_MANIFEST.json` — owned paths + `@ssot` targets
3. `docs/products/AUTHORITY_BOUNDARIES.md` — canonical vs history
4. `docs/products/lifeos/PRODUCT_HOME.md` — law / receipts only (not first product read)

## Do not treat as product authority

- `docs/products/LIFEOS.md` — redirect stub only
- `builderos-reboot/MISSIONS/*/CONTENT/**` — mission snapshots (`HISTORY_SNAPSHOT`)
- `docs/conversation_dumps/**` — research archives
- Amendment change-receipt rows without re-verify

Verify before commit: `npm run lifeos:product-home:verify`
