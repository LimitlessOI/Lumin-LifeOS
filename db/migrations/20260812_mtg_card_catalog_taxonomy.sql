-- SYNOPSIS: Catalog taxonomy columns for MTG collection breakdowns — rarity,
-- set code/name, set release date, and generation/era. Populated from Scryfall
-- on price lookup so the founder can see counts by set, year, foil, rarity.
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS rarity TEXT;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_code TEXT;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_name TEXT;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS set_released_at DATE;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS era TEXT;

CREATE INDEX IF NOT EXISTS mtg_card_collection_era_idx ON mtg_card_collection (user_id, era);
CREATE INDEX IF NOT EXISTS mtg_card_collection_rarity_idx ON mtg_card_collection (user_id, rarity);
CREATE INDEX IF NOT EXISTS mtg_card_collection_set_code_idx ON mtg_card_collection (user_id, set_code);
