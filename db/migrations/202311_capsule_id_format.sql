-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsule
ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE capsule
SET id = gen_random_uuid()
WHERE id IS NULL OR id = '' OR id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

ALTER TABLE capsule
ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE capsule
ALTER COLUMN id SET NOT NULL;