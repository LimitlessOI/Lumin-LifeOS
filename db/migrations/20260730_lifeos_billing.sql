-- SYNOPSIS: Creative Engine schema expansion — LifeOS paid tier checkout sessions
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

BEGIN;

CREATE TABLE IF NOT EXISTS lifeos_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('core','premium','family')),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_status TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled','failed')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_checkout_user ON lifeos_checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lifeos_checkout_session ON lifeos_checkout_sessions(stripe_session_id);

COMMIT;
