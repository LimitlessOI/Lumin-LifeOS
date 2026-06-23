-- SYNOPSIS: LifeRE receptionist call logs (Am 29 bridge table).
CREATE TABLE IF NOT EXISTS lifere_call_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'adam',
  call_id TEXT NOT NULL,
  caller_number TEXT,
  intent TEXT,
  lead_score TEXT CHECK (lead_score IN ('hot','warm','cold')),
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (call_id)
);

CREATE INDEX IF NOT EXISTS idx_lifere_call_logs_user ON lifere_call_logs (user_id, created_at DESC);
