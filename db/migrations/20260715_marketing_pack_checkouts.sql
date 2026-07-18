-- SYNOPSIS: marketing_pack_checkouts — Stripe sessions for SMOS $49 content packs
-- @ssot docs/products/marketingos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS marketing_pack_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS marketing_pack_checkouts_session_idx
  ON marketing_pack_checkouts (session_id);
