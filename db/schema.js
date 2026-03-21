/**
 * Drizzle ORM Schema — LifeOS / AI Counsel OS
 *
 * SAFE TRANSITION: This coexists with existing raw `pg` queries.
 * Nothing in existing code changes. New code uses Drizzle.
 * Old `pool.query(...)` calls continue to work on the same connection.
 *
 * Setup:
 *   1. Run `npx drizzle-kit introspect` to generate this from your live Neon DB.
 *      OR define tables here and run `npx drizzle-kit push` to create them.
 *   2. Import { db } from './db/index.js' in new service files.
 *
 * Current tables defined here are the NEW ones needed for the ideas→products pipeline.
 * Existing tables (memories, execution_tasks, etc.) can be added incrementally.
 */

import { pgTable, text, integer, real, boolean, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

// ── Ideas ─────────────────────────────────────────────────────────────────────
// Persistent idea store — replaces in-memory IdeaEngine.dailyIdeas
export const ideas = pgTable('ideas', {
  id:                uuid('id').defaultRandom().primaryKey(),
  title:             text('title').notNull(),
  description:       text('description'),
  source:            text('source'),                    // 'daily-gen' | 'conversation' | 'manual' | 'council'
  status:            text('status').default('queued'),  // queued | in_progress | implemented | validated | stale
  alignmentScore:    real('alignment_score'),           // 0-100: North Star alignment
  revenuePotential:  integer('revenue_potential'),      // 1-5
  effortEstimate:    integer('effort_estimate'),        // 1-5
  riskLevel:         text('risk_level'),                // low | medium | high
  priorityScore:     real('priority_score'),            // computed: revenue*3 + alignment*2 - effort
  pipelineId:        text('pipeline_id'),               // linked pipeline run
  outcomeId:         text('outcome_id'),                // linked outcome tracking
  createdAt:         timestamp('created_at').defaultNow(),
  implementedAt:     timestamp('implemented_at'),
  metadata:          jsonb('metadata'),
});

// ── Pipeline Runs ─────────────────────────────────────────────────────────────
// Tracks each idea→implementation run with cost and outcome
export const pipelineRuns = pgTable('pipeline_runs', {
  id:               text('id').primaryKey(),            // pipeline_timestamp_random
  ideaId:           uuid('idea_id').references(() => ideas.id),
  status:           text('status').default('running'),  // running | completed | failed | rolled_back
  concept:          jsonb('concept'),
  design:           jsonb('design'),
  plan:             jsonb('plan'),
  snapshotId:       text('snapshot_id'),
  autoDeploy:       boolean('auto_deploy').default(false),
  totalCostUsd:     real('total_cost_usd').default(0),
  filesModified:    jsonb('files_modified'),
  error:            text('error'),
  rolledBack:       boolean('rolled_back').default(false),
  startedAt:        timestamp('started_at').defaultNow(),
  completedAt:      timestamp('completed_at'),
});

// ── Games ─────────────────────────────────────────────────────────────────────
// Published Phaser.js games
export const games = pgTable('games', {
  id:          text('id').primaryKey(),                 // game_timestamp_random
  title:       text('title').notNull(),
  type:        text('type'),                            // platformer | arcade | puzzle | rpg | etc
  idea:        text('idea'),
  features:    jsonb('features'),
  publicUrl:   text('public_url'),                      // /games/{id}
  filePath:    text('file_path'),
  status:      text('status').default('live'),          // live | archived
  playCount:   integer('play_count').default(0),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ── Video Jobs ────────────────────────────────────────────────────────────────
// Video generation jobs and outputs
export const videoJobs = pgTable('video_jobs', {
  id:            text('id').primaryKey(),               // vid_timestamp_random
  script:        text('script').notNull(),
  style:         text('style').default('cinematic'),
  durationSec:   integer('duration_sec').default(30),
  useVideoModel: boolean('use_video_model').default(false),
  status:        text('status').default('pending'),     // pending | generating | complete | failed
  videoPath:     text('video_path'),
  publicUrl:     text('public_url'),
  sceneCount:    integer('scene_count'),
  costUsd:       real('cost_usd'),
  replicateModel: text('replicate_model'),
  error:         text('error'),
  createdAt:     timestamp('created_at').defaultNow(),
  completedAt:   timestamp('completed_at'),
});

// ── Product Outcomes ─────────────────────────────────────────────────────────
// Tracks whether shipped features are actually being used / generating revenue
export const outcomes = pgTable('outcomes', {
  id:              uuid('id').defaultRandom().primaryKey(),
  ideaId:          uuid('idea_id').references(() => ideas.id),
  pipelineId:      text('pipeline_id'),
  featureName:     text('feature_name'),
  apiCallCount:    integer('api_call_count').default(0),
  revenueUsd:      real('revenue_usd').default(0),
  isValidated:     boolean('is_validated').default(false),
  validatedAt:     timestamp('validated_at'),
  notes:           text('notes'),
  weekOf:          timestamp('week_of'),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ── Prospect Sites ────────────────────────────────────────────────────────────
// Mock sites built for cold-outreach prospects
export const prospectSites = pgTable('prospect_sites', {
  clientId:       text('client_id').primaryKey(),
  businessUrl:    text('business_url'),
  contactEmail:   text('contact_email'),
  contactName:    text('contact_name'),
  businessName:   text('business_name'),
  previewUrl:     text('preview_url'),
  emailSent:      boolean('email_sent').default(false),
  followUpCount:  integer('follow_up_count').default(0),
  lastFollowUpAt: timestamp('last_follow_up_at'),
  status:         text('status').default('sent'),          // sent | viewed | replied | converted | lost
  dealValue:      real('deal_value'),
  metadata:       jsonb('metadata'),
  createdAt:      timestamp('created_at').defaultNow(),
});

// ── Feature Flags (DB-backed, upgrades from env-var flags) ───────────────────
export const featureFlags = pgTable('feature_flags', {
  name:        text('name').primaryKey(),
  enabled:     boolean('enabled').default(false),
  rolloutPct:  integer('rollout_pct').default(100),     // 0-100 for gradual rollout
  updatedAt:   timestamp('updated_at').defaultNow(),
  updatedBy:   text('updated_by'),
  notes:       text('notes'),
});
