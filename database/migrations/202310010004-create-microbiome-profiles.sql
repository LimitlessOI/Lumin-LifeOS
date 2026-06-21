-- SYNOPSIS: SQL — 202310010004-create-microbiome-profiles.sql.
CREATE TABLE microbiome_profiles (
  id SERIAL PRIMARY KEY,
  variety_id INTEGER REFERENCES biocrop_varieties(id),
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);