-- SYNOPSIS: Database migration — 20260704_create_twin_ingest_control.sql.
CREATE TABLE IF NOT EXISTS twin_ingest_control (
  last_message_id UUID NOT NULL
);