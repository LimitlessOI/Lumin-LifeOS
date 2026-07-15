-- SYNOPSIS: Database migration — 2023-10-12-wire-readiness-check.sql.
CREATE TABLE IF NOT EXISTS manifests (
    id SERIAL PRIMARY KEY,
    build_ready BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS amendment_gates (
    id SERIAL PRIMARY KEY,
    manifest_id INT NOT NULL REFERENCES manifests(id),
    pre_build_readiness BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE OR REPLACE FUNCTION fail_ci_on_readiness_check() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.build_ready = TRUE THEN
        PERFORM 1
        FROM amendment_gates
        WHERE manifest_id = NEW.id AND pre_build_readiness = FALSE;
        
        IF FOUND THEN
            RAISE EXCEPTION 'Build readiness check failed: Pre-Build Readiness gates are not filled';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_build_readiness ON manifests;

CREATE TRIGGER check_build_readiness
AFTER INSERT OR UPDATE ON manifests
FOR EACH ROW EXECUTE FUNCTION fail_ci_on_readiness_check();
