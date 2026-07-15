-- SYNOPSIS: Database migration — add_cont_approval_timeout.sql.
ALTER SYSTEM SET approval_timeout = INTERVAL '48 hours';