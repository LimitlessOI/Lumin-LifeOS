-- SYNOPSIS: Database migration — 20261001_create_sleep_tracking_tables.sql.
-- sleep_logs is created in 20260420_lifeos_phase2_schema.sql; this migration only adds index/FK if the table exists.
-- Add indexes and FK only if the columns this migration owns actually exist in the existing sleep_logs table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sleep_logs')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sleep_logs' AND column_name='user_id')
  THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_sleep_logs_user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_id ON sleep_logs(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sleep_logs' AND column_name='user_id')
    THEN
      ALTER TABLE sleep_logs DROP CONSTRAINT IF EXISTS fk_sleep_logs_user_id;
      ALTER TABLE sleep_logs ADD CONSTRAINT fk_sleep_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sleep_logs index/fk skipped: %', SQLERRM;
END $$;
