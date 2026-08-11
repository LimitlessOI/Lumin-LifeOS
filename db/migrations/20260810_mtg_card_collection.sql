-- SYNOPSIS: mtg_card_collection for batch photo -> AI identification -> Scryfall pricing -> sell-venue routing.
CREATE TABLE IF NOT EXISTS mtg_card_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  batch_id UUID NOT NULL,
  photo_name TEXT,
  identified_name TEXT,
  identified_set TEXT,
  is_foil BOOLEAN,
  condition_guess TEXT,
  identify_confidence TEXT,
  identify_error TEXT,
  scryfall_id TEXT,
  price_usd NUMERIC,
  price_usd_foil NUMERIC,
  price_used NUMERIC,
  price_source TEXT,
  value_tier TEXT,
  recommended_venue TEXT,
  status TEXT NOT NULL DEFAULT 'identified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mtg_card_collection_batch_idx
  ON mtg_card_collection (batch_id);

CREATE INDEX IF NOT EXISTS mtg_card_collection_user_idx
  ON mtg_card_collection (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mtg_card_collection_tier_idx
  ON mtg_card_collection (value_tier);
