-- SYNOPSIS: Database migration — 20240915_site_builder_ab_subject.sql.
-- AB subject-line test tables for site builder email subject experiments

CREATE TABLE IF NOT EXISTS site_builder_ab_subject_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  variant_a text NOT NULL,
  variant_b text NOT NULL,
  winner text,
  sends_a integer DEFAULT 0,
  sends_b integer DEFAULT 0,
  opens_a integer DEFAULT 0,
  opens_b integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_builder_ab_subject_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES site_builder_ab_subject_tests(id),
  variant text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_tests_site_id
  ON site_builder_ab_subject_tests (site_id);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_tests_status
  ON site_builder_ab_subject_tests (status);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_events_test_id
  ON site_builder_ab_subject_events (test_id);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_events_variant
  ON site_builder_ab_subject_events (variant);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_events_event_type
  ON site_builder_ab_subject_events (event_type);

CREATE INDEX IF NOT EXISTS idx_site_builder_ab_subject_events_occurred_at
  ON site_builder_ab_subject_events (occurred_at);