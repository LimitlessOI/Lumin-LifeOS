-- SYNOPSIS: Durable storage for MTG upload photos. Prior pipeline discarded
-- image buffers after vision ID -- founder correction 2026-08-12: photos must
-- be kept for listing/selling automation. BYTEA is the fail-closed path until
-- R2 is configured on Railway (creative health currently reports r2Configured:false).
CREATE TABLE IF NOT EXISTS mtg_card_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  batch_id UUID NOT NULL,
  photo_name TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_size INTEGER NOT NULL,
  -- Compressed listing-oriented JPEG (or original mime if compression skipped).
  data BYTEA,
  r2_key TEXT,
  r2_url TEXT,
  kind TEXT NOT NULL DEFAULT 'source', -- source | crop
  parent_photo_id UUID REFERENCES mtg_card_photos(id) ON DELETE SET NULL,
  card_slot INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mtg_card_photos_batch_idx ON mtg_card_photos (batch_id);
CREATE INDEX IF NOT EXISTS mtg_card_photos_user_idx ON mtg_card_photos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mtg_card_photos_parent_idx ON mtg_card_photos (parent_photo_id);

ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS source_photo_id UUID;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS listing_photo_id UUID;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sell_status TEXT NOT NULL DEFAULT 'catalogued';
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sell_venue_target TEXT;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE mtg_card_collection ADD COLUMN IF NOT EXISTS sale_price_usd NUMERIC;

CREATE INDEX IF NOT EXISTS mtg_card_collection_sell_status_idx
  ON mtg_card_collection (user_id, sell_status);
