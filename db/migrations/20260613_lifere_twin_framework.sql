-- SYNOPSIS: Database migration — 20260613_lifere_twin_framework.sql.
CREATE TABLE IF NOT EXISTS lifere_activity_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conversations INT NOT NULL DEFAULT 0,
  calls INT NOT NULL DEFAULT 0,
  texts INT NOT NULL DEFAULT 0,
  emails INT NOT NULL DEFAULT 0,
  appointments_set INT NOT NULL DEFAULT 0,
  appointments_held INT NOT NULL DEFAULT 0,
  buyer_consults INT NOT NULL DEFAULT 0,
  listing_appointments INT NOT NULL DEFAULT 0,
  signed_clients INT NOT NULL DEFAULT 0,
  signed_listings INT NOT NULL DEFAULT 0,
  offers_written INT NOT NULL DEFAULT 0,
  contracts INT NOT NULL DEFAULT 0,
  closings INT NOT NULL DEFAULT 0,
  commission_gci NUMERIC(12,2) NOT NULL DEFAULT 0,
  skill_practice_minutes INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS lifere_performance_snapshot (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  funnel JSONB NOT NULL,
  conversion_rates JSONB NOT NULL,
  bottleneck_stage TEXT NOT NULL,
  income_goal_monthly NUMERIC(12,2) NOT NULL DEFAULT 30000,
  activities_to_goal JSONB NOT NULL,
  next_hour_recommendation JSONB NOT NULL,
  label TEXT NOT NULL DEFAULT 'THINK'
);

CREATE TABLE IF NOT EXISTS lifere_permission_grants (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  autonomy_level SMALLINT NOT NULL CHECK (autonomy_level BETWEEN 0 AND 5),
  bounds JSONB NOT NULL DEFAULT '{}',
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, action_type)
);

CREATE TABLE IF NOT EXISTS lifere_approval_queue (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  draft_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  autonomy_level_required SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS lifere_client_comms_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  client_ref TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
  template_id TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  approval_queue_id BIGINT REFERENCES lifere_approval_queue(id)
);

CREATE TABLE IF NOT EXISTS lifere_twin_pg_mirror (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  twin_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, twin_key)
);

CREATE TABLE IF NOT EXISTS lifere_skill_drill_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  score NUMERIC(5,2),
  duration_minutes INT NOT NULL,
  debrief TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_voice_calibration (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_content_calendar (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  video_type_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  script_ref TEXT,
  hook_ref TEXT,
  channels JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS lifere_hook_library (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  niche TEXT,
  performance_score NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  funnel_id TEXT NOT NULL,
  step TEXT NOT NULL,
  lead_ref TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_ad_spend (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  spend_usd NUMERIC(12,2) NOT NULL,
  leads_count INT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS lifere_recruiting_pipeline (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_opportunity_signals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  address_or_mls TEXT,
  score NUMERIC(8,4),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_finance_forecast (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  forecast_month DATE NOT NULL,
  projected_gci NUMERIC(12,2) NOT NULL,
  pipeline_weighted NUMERIC(12,2) NOT NULL,
  runway_months NUMERIC(6,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_scenarios (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_experiments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  metric TEXT NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_relationship_edges (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  edge_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO lifere_permission_grants (user_id, action_type, autonomy_level, bounds, granted_by)
VALUES
  ('adam', 'boldtrail_note', 2, '{"max_per_day": 50}', 'system_default'),
  ('adam', 'sms_client', 1, '{}', 'system_default'),
  ('adam', 'email_lead', 1, '{}', 'system_default'),
  ('adam', 'post_social', 1, '{}', 'system_default')
ON CONFLICT DO NOTHING;
