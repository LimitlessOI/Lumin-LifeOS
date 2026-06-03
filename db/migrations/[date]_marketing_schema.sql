-- Migration for AMENDMENT 41 — MarketingOS / SocialMediaOS Phase 1 db tables
-- This migration creates 5 tables: marketing_campaigns, marketing_audiences, social_accounts, social_posts, and marketing_sessions.

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: marketing_campaigns
CREATE