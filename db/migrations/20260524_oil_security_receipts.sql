-- db/migrations/20260524_oil_security_receipts.sql
-- OIL Security Alpha receipt spine — append-only audit table.
-- No UPDATE or DELETE is intentional; receipts are immutable evidence.

CREATE TABLE IF NOT EXISTS security_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_type TEXT NOT NULL CHECK (receipt_type IN (
        'gemini_live_proof',
        'oil_audit_run',
        'red_team_finding',
        'security_fix_verified',
        'daily_oil_summary',
        'honeypot_probe',
        'canary_trip',
        'builder_supervised_build',
        'builder_mode_change'
    )),
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only enforcement: block UPDATE and DELETE at the DB level.
-- INSERT is still allowed so the service can write new receipts.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_rules
        WHERE tablename = 'security_receipts' AND rulename = 'no_update_security_receipts'
    ) THEN
        CREATE RULE no_update_security_receipts AS
            ON UPDATE TO security_receipts DO INSTEAD NOTHING;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_rules
        WHERE tablename = 'security_receipts' AND rulename = 'no_delete_security_receipts'
    ) THEN
        CREATE RULE no_delete_security_receipts AS
            ON DELETE TO security_receipts DO INSTEAD NOTHING;
    END IF;
END$$;

-- Index for type-filtered queries (OIL daily summary, Red Team findings).
CREATE INDEX IF NOT EXISTS idx_security_receipts_type_created
    ON security_receipts (receipt_type, created_at DESC);
