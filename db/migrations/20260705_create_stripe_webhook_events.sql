-- SYNOPSIS: Database migration — 20260705_create_stripe_webhook_events.sql.
-- Create table for Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_event JSONB NOT NULL
);

-- Index for querying Stripe webhook events by type
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type
  ON stripe_webhook_events (event_type);