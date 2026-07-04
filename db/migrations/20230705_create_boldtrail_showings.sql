-- SYNOPSIS: Database migration — 20230705_create_boldtrail_showings.sql.
CREATE TABLE IF NOT EXISTS boldtrail_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_property_id
  ON boldtrail_showings (property_id);

CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_scheduled_time
  ON boldtrail_showings (scheduled_time);