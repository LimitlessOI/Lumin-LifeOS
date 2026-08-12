<!-- SYNOPSIS: 2026-08-12 — MTG collection stats: set / era / year / foil / rarity / status -->

# 2026-08-12 — MTG collection stats: set / era / year / foil / rarity / status

## Context
Continuation of the MTG catalog → sell automation thread. Photos are now kept; multi-card ID works. Adam wants to *see the collection broken down*, not only a flat priced list.

## Founder ask (verbatim intent)
He wants counts and statuses by:
- Categories / sets / versions
- Generation of the cards (era)
- Foil vs not
- Rarity (rare, unique/mythic, etc.)
- Statuses on those
- Year the set came out

## Decision
Ship taxonomy on each priced row from Scryfall (`rarity`, `set_code`, `set_name`, `set_released_at`, `era`) plus `GET /collection/stats` and upload-page panels. Existing rows need one **Re-price** pass to backfill year/rarity/era (no vision cost).

## Era buckets (generation)
- 1993 — Alpha / Beta / Unlimited / Arabian
- 1994–95 — early expansions
- 1996–97 — mid-90s / Mirage–Tempest
- 1998–99 — late 90s / Urza–Masques
- 2000–03 — early 2000s
- 2004+ — modern

## Not done yet
Marketplace auto-list (TCGPlayer/eBay) still foundation-only.
