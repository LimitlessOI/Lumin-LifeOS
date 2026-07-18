-- SYNOPSIS: Database migration — 20240801_site_builder_templates.sql.
CREATE TABLE IF NOT EXISTS site_builder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  config JSONB NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_builder_templates (name, thumbnail_url, config, sort_order)
VALUES
  (
    'Clean Business',
    NULL,
    '{"theme":"clean-business","layout":"single-column","palette":{"primary":"#1f2937","secondary":"#e5e7eb","accent":"#2563eb"},"sections":["hero","services","testimonials","contact"],"style":{"radius":"lg","shadow":"soft"}}'::jsonb,
    1
  ),
  (
    'Bold Agency',
    NULL,
    '{"theme":"bold-agency","layout":"split-hero","palette":{"primary":"#0f172a","secondary":"#f8fafc","accent":"#f97316"},"sections":["hero","work","clients","contact"],"style":{"radius":"md","shadow":"strong"}}'::jsonb,
    2
  ),
  (
    'Minimal Portfolio',
    NULL,
    '{"theme":"minimal-portfolio","layout":"gallery","palette":{"primary":"#111827","secondary":"#ffffff","accent":"#6b7280"},"sections":["hero","projects","about","contact"],"style":{"radius":"none","shadow":"none"}}'::jsonb,
    3
  ),
  (
    'Warm Local',
    NULL,
    '{"theme":"warm-local","layout":"stacked","palette":{"primary":"#7c2d12","secondary":"#fff7ed","accent":"#ea580c"},"sections":["hero","about","services","reviews","contact"],"style":{"radius":"xl","shadow":"soft"}}'::jsonb,
    4
  ),
  (
    'Tech Startup',
    NULL,
    '{"theme":"tech-startup","layout":"product-led","palette":{"primary":"#0b1120","secondary":"#f8fafc","accent":"#22c55e"},"sections":["hero","features","pricing","faq","contact"],"style":{"radius":"lg","shadow":"soft"}}'::jsonb,
    5
  )
ON CONFLICT DO NOTHING;