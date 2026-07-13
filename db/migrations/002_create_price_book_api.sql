-- SYNOPSIS: Database migration — 002_create_price_book_api.sql.
-- Price book API schema for print partners
-- Extends existing LifeOS database with tables and supporting indexes.

BEGIN;

CREATE TABLE IF NOT EXISTS price_book_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_code TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_book_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES price_book_partners(id) ON DELETE CASCADE,
  catalog_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  effective_start_date DATE,
  effective_end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_book_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES price_book_catalogs(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  unit_price NUMERIC(12,2) NOT NULL,
  setup_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER,
  lead_time_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS price_book_items_catalog_sku_idx
  ON price_book_items (catalog_id, sku);

CREATE INDEX IF NOT EXISTS price_book_catalogs_partner_active_idx
  ON price_book_catalogs (partner_id, is_active);

CREATE INDEX IF NOT EXISTS price_book_items_catalog_active_idx
  ON price_book_items (catalog_id, is_active);

COMMIT;