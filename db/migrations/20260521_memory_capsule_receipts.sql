-- db/migrations/20260521_memory_capsule_receipts.sql

-- This migration extends retrieval_events and memory_use_receipts
-- and creates memory_import_receipts for Memory Capsule tracking.

-- Ensure UUID extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp