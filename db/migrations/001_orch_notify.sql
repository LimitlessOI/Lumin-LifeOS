-- SYNOPSIS: Database migration — 001_orch_notify.sql.
-- Legacy orch notify — skip when orch_tasks table absent (production LifeOS DB).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orch_tasks'
  ) THEN
    CREATE OR REPLACE FUNCTION notify_orch_task() RETURNS TRIGGER AS $fn$
    BEGIN
        IF NEW.status = 'queued' THEN
            PERFORM pg_notify('orch_new_task', NEW.id::text);
        END IF;
        RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS orch_notify_trigger ON orch_tasks;
    CREATE TRIGGER orch_notify_trigger
    AFTER INSERT ON orch_tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_orch_task();
  END IF;
END $$;
