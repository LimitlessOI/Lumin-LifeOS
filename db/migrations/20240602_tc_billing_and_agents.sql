-- SYNOPSIS: Database migration — 20240602_tc_billing_and_agents.sql.
-- Billing subscriptions linked to agent registry records
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_registry_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_agent_registry_id
  ON stripe_subscriptions (agent_registry_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_stripe_customer_id
  ON stripe_subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_stripe_subscription_id
  ON stripe_subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
  ON stripe_subscriptions (status);

-- First paying agent enrollment tracking
CREATE TABLE IF NOT EXISTS enrolled_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_registry_id uuid,
  enrolled_at timestamptz DEFAULT now(),
  onboarding_complete boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_enrolled_agents_agent_registry_id
  ON enrolled_agents (agent_registry_id);

CREATE INDEX IF NOT EXISTS idx_enrolled_agents_onboarding_complete
  ON enrolled_agents (onboarding_complete);