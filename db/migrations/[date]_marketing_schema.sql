CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables in reverse order of dependency to ensure clean recreation
DROP TABLE IF EXISTS marketing_analytics CASCADE;
DROP TABLE IF EXISTS marketing_interactions CASCADE;
DROP TABLE IF EXISTS marketing_posts CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS marketing_sessions CASCADE;

--