-- SYNOPSIS: Database migration — 20260713_marketing_session_export.sql.
CREATE TABLE IF NOT EXISTS marketing_session_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  exported_at timestamptz DEFAULT now(),
  export_format text NOT NULL,
  export_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);