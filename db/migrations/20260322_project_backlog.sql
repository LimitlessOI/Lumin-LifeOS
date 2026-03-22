-- Migration: 20260322_project_backlog
-- Project backlog: prioritized queue the autonomy orchestrator works through
-- when no manual ideas are pending. One project active at a time.
-- Adam marks projects complete. System never auto-generates ideas.

BEGIN;

CREATE TABLE IF NOT EXISTS project_backlog (
  id             SERIAL PRIMARY KEY,
  name           TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  amendment      TEXT,                        -- e.g. AMENDMENT_05_SITE_BUILDER
  priority       INT         NOT NULL DEFAULT 99,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','active','complete','skipped')),
  notes          TEXT,
  last_triggered_at TIMESTAMPTZ,              -- when orchestrator last queued tasks for this
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: North Star priority order (05 → 08 → 10 → remaining in amendment order)
INSERT INTO project_backlog (name, description, amendment, priority) VALUES
  ('Site Builder + Prospect Pipeline',
   'AI-generated click-funnel sites for wellness businesses. Cold email pipeline drives bookings. POS affiliate revenue ($50-$2500/referral). Fastest path to $500/day.',
   'AMENDMENT_05_SITE_BUILDER', 1),

  ('Outreach & CRM',
   'Cold outreach sequences, agent CRM, follow-up automation. Feeds Site Builder pipeline with qualified prospects.',
   'AMENDMENT_08_OUTREACH_CRM', 2),

  ('API Cost Savings Service',
   'B2B SaaS — sell access to multi-model routing + caching. Demo value instantly. Easiest close.',
   'AMENDMENT_10_API_COST_SAVINGS', 3),

  ('AI Council System',
   'Multi-model AI routing, failover, consensus voting. Core enabler for all other projects.',
   'AMENDMENT_01_AI_COUNCIL', 4),

  ('Memory System',
   'Persistent memory across sessions: user profile, project state, feedback loops.',
   'AMENDMENT_02_MEMORY_SYSTEM', 5),

  ('Financial & Revenue Tracking',
   'Revenue dashboard, Stripe integration, daily spend tracking, ROI per project.',
   'AMENDMENT_03_FINANCIAL_REVENUE', 6),

  ('Auto-Builder (Guarded)',
   'Self-programming pipeline: idea → components → code → deploy. Requires Adam approval for risk 3+.',
   'AMENDMENT_04_AUTO_BUILDER', 7),

  ('Game Publisher',
   'Phaser.js games as lead-gen and micro-SaaS. Single HTML file per game, CDN delivery.',
   'AMENDMENT_06_GAME_PUBLISHER', 8),

  ('Video Pipeline',
   'Replicate API video generation (Kling 1.6 quality, Wan 2.1 speed). Content + ad creation.',
   'AMENDMENT_07_VIDEO_PIPELINE', 9),

  ('Life Coaching / Personal OS',
   'Subscription MRR product. AI life coaching, habit tracking, personal outcome measurement.',
   'AMENDMENT_09_LIFE_COACHING', 10),

  ('BoldTrail Real Estate CRM',
   'Per-agent subscription. Showing follow-ups, vacation mode auto-response, agent onboarding.',
   'AMENDMENT_11_BOLDTRAIL_REALESTATE', 11),

  ('Command Center & Overlay',
   'Internal control panel. Build queue, project backlog, autonomy controls, spend dashboard.',
   'AMENDMENT_12_COMMAND_CENTER', 12),

  ('Knowledge Base & Web Intelligence',
   'Web scraping, knowledge indexing, drift detection. Enabler for all research-heavy features.',
   'AMENDMENT_13_KNOWLEDGE_BASE', 13),

  ('White-Label Platform',
   'Resell the full LifeOS stack to agencies. High long-term revenue, low near-term priority.',
   'AMENDMENT_14_WHITE_LABEL', 14),

  ('Business Tools Suite',
   'Supporting tools: word keeper, wellness studio, website audit, business center.',
   'AMENDMENT_15_BUSINESS_TOOLS', 15)

ON CONFLICT DO NOTHING;

COMMIT;
