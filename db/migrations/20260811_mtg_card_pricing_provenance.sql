-- SYNOPSIS: Pricing provenance for mtg_card_collection -- records WHICH paper
-- printing a price came from and how wide the spread across printings is, so a
-- card whose set could not be resolved degrades into an honest range plus a
-- review flag instead of a confidently wrong number. Backfills the columns
-- services/mtg-card-pricing.js's rewrite (2026-08-11) now returns, plus the two
-- columns routes/mtg-cards-routes.js had only ever created via runtime ALTER.
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'photo_vision';
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_min_usd NUMERIC;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_max_usd NUMERIC;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS printing_count INTEGER;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS price_match TEXT;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS priced_at TIMESTAMPTZ;

-- Collection view sorts by value and filters the review queue; both are read
-- on every page load of the sell list.
CREATE INDEX IF NOT EXISTS mtg_card_collection_user_price_idx
  ON mtg_card_collection (user_id, price_used DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS mtg_card_collection_review_idx
  ON mtg_card_collection (user_id, needs_review) WHERE needs_review = TRUE;

-- Exact-duplicate detection: the same photo uploaded in two different batches
-- (confirmed live 2026-08-11 -- 110 identical filenames across two batches
-- five minutes apart) must be collapsible to one physical card.
CREATE INDEX IF NOT EXISTS mtg_card_collection_photo_dedupe_idx
  ON mtg_card_collection (user_id, photo_name) WHERE photo_name IS NOT NULL;
