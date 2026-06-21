-- SYNOPSIS: SQL — 202310010001-create-biocrop-varieties.sql.
CREATE TABLE biocrop_varieties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  genome_sequence TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);