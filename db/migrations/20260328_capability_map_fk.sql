-- Add capability_map → project_segments FK after governance tables exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_segments'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'capability_map'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'capability_map_segment_id_fkey'
  ) THEN
    ALTER TABLE capability_map
      ADD CONSTRAINT capability_map_segment_id_fkey
      FOREIGN KEY (segment_id) REFERENCES project_segments(id) ON DELETE SET NULL;
  END IF;
END $$;
