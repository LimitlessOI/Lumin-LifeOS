<!-- SYNOPSIS: SocialMediaOS Module Home -->

# SocialMediaOS Module Home

**Parent product:** [MarketingOS](../PRODUCT_HOME.md)  
**Formerly called:** Amendment 41 — first customer-facing module  
**Product id:** `socialmediaos` (module under MarketingOS)  
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`  
**Machine manifest:** `docs/products/marketingos/socialmediaos/FILE_MANIFEST.json`  
**Last Updated:** 2026-06-29

---

## Scope

SocialMediaOS is the **first shipped module** inside MarketingOS.

Core loop: founder coaching session → transcript → story extraction → content pack → approval → export.

Platform phases (YouTubeOS, PodcastOS, CampaignOS) live in the parent [MarketingOS product home](../PRODUCT_HOME.md).

## Owned runtime (this module)

See `FILE_MANIFEST.json` in this folder.

High-signal surfaces:
- `/api/v1/socialmediaos/*` — intake scaffold (sessions, content packs)
- `/api/v1/lifere/marketing/socialmediaos/*` — LifeRE adapter bridge
- `public/overlay/lifeos-lifere.html` — founder panel
- `lifeos-app.html?stack=socialmediaos` — stack launcher

## Verification

```bash
node scripts/verify-socialmediaos.mjs
node scripts/run-founder-socialmediaos-chat-a2z.mjs
```

## Phase 1 MVP spec

Full Phase 1 technical specification: parent PRODUCT_HOME §5 Phase 1 and §6.
