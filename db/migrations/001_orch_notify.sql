-- Migration script to create NOTIFY channel and trigger

CREATE OR REPLACE FUNCTION notify_orch_task() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'queued' THEN
        PERFORM pg_notify('orch_new_task', NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orch_notify_trigger
AFTER INSERT ON orch_tasks
FOR EACH ROW
EXECUTE FUNCTION notify_orch_task();